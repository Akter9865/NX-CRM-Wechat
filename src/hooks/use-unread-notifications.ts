"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Notification } from "@/types";

/**
 * Count of unread notifications for the current user, shared by every
 * consumer (sidebar, header, mobile nav). One count query and ONE
 * realtime channel per tab — previously each consumer opened its own.
 * The channel is ref-counted and torn down when the last consumer
 * unmounts; on tab re-focus the count is re-synced to heal any events
 * missed while the socket was asleep.
 */
let count = 0;
let consumers = 0;
let channel: RealtimeChannel | null = null;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

async function resync() {
  const supabase = createClient();
  const { count: unread, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (!error) set(unread ?? 0);
}

// Coalesce bursts (e.g. "mark all read" emits one UPDATE per row).
let resyncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleResync() {
  if (resyncTimer) clearTimeout(resyncTimer);
  resyncTimer = setTimeout(() => {
    resyncTimer = null;
    void resync();
  }, 250);
}

function onVisible() {
  if (document.visibilityState === "visible") scheduleResync();
}

function start() {
  const supabase = createClient();
  void resync();
  channel = supabase
    .channel(`notifications-unread-${Math.random().toString(36).slice(2, 9)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
      if (payload.eventType === "INSERT") {
        if (!(payload.new as Notification).read_at) set(count + 1);
      } else if (payload.eventType === "UPDATE") {
        const n = payload.new as Notification;
        const o = payload.old as Partial<Notification>;
        // `old` only carries the PK unless REPLICA IDENTITY FULL; resync
        // instead of guessing when we can't tell what changed.
        if (o.read_at === undefined) scheduleResync();
        else if (n.read_at && !o.read_at) set(Math.max(0, count - 1));
      } else if (payload.eventType === "DELETE") {
        scheduleResync();
      }
    })
    .subscribe();
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  if (channel) void createClient().removeChannel(channel);
  channel = null;
  document.removeEventListener("visibilitychange", onVisible);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useUnreadNotifications(): number {
  useEffect(() => {
    consumers += 1;
    if (consumers === 1) start();
    return () => {
      consumers -= 1;
      if (consumers === 0) stop();
    };
  }, []);
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
