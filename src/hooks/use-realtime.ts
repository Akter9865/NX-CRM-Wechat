"use client";

import { useEffect, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface RealtimeTableBinding {
  table: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  /** PostgREST-style filter, e.g. `conversation_id=eq.<uuid>`. */
  filter?: string;
}

export type RealtimeRow = Record<string, unknown>;

export interface UseRealtimeChannelOptions {
  /** Readable prefix for the channel topic (debugging only). */
  name: string;
  /**
   * Subscription identity. The channel is (re)built whenever this changes
   * and torn down while it is null. `tables` must be derived from it.
   */
  channelKey: string | null;
  tables: RealtimeTableBinding[];
  onChange: (
    table: string,
    payload: RealtimePostgresChangesPayload<RealtimeRow>,
  ) => void;
  /**
   * Gap-fill hook. Fired after a *re*-subscribe (not the first one), when
   * the tab becomes visible again, and when the browser comes back online
   * — i.e. whenever events may have been missed. Callers refetch.
   */
  onResync?: () => void;
}

/** "connecting" (first subscribe) counts as healthy — no alarming flash on load. */
export function isRealtimeHealthy(status: RealtimeConnectionStatus): boolean {
  return status === "connected" || status === "connecting";
}

const MAX_BACKOFF_MS = 30_000;
/** Visibility/online can fire in bursts; don't refetch more often than this. */
const RESYNC_THROTTLE_MS = 3_000;
/** How long a tab must have been hidden before becoming visible triggers a resync. */
const HIDDEN_RESYNC_MS = 5_000;

function uniqueSuffix(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

/**
 * One Supabase Realtime channel with:
 *  - a unique topic per subscribe attempt — supabase-js returns an
 *    *existing* channel for a reused topic, so a remount (or React strict
 *    mode's double effect) could otherwise grab a channel that is still
 *    leaving and fail with "tried to subscribe multiple times";
 *  - exponential-backoff resubscribe on CHANNEL_ERROR / TIMED_OUT / CLOSED;
 *  - `onResync` on reconnect / visibility / online so the caller can
 *    backfill anything missed while the socket was down.
 *
 * Handlers are read through refs, so passing inline callbacks never
 * triggers a resubscribe.
 */
export function useRealtimeChannel({
  name,
  channelKey,
  tables,
  onChange,
  onResync,
}: UseRealtimeChannelOptions): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");

  const tablesRef = useRef(tables);
  const onChangeRef = useRef(onChange);
  const onResyncRef = useRef(onResync);
  useEffect(() => {
    tablesRef.current = tables;
    onChangeRef.current = onChange;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    if (!channelKey) return;

    const supabase = createClient();
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let subscribedOnce = false;
    // True between a channel failure and the next successful subscribe.
    let errored = false;
    let lastResyncAt = 0;

    const resync = (force = false) => {
      if (disposed) return;
      const now = Date.now();
      if (!force && now - lastResyncAt < RESYNC_THROTTLE_MS) return;
      lastResyncAt = now;
      onResyncRef.current?.();
    };

    const teardown = () => {
      const old = channel;
      channel = null;
      if (old) void supabase.removeChannel(old);
    };

    const scheduleRetry = (immediate = false) => {
      if (disposed) return;
      if (retryTimer) {
        if (!immediate) return;
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      teardown();
      // Status stays "error"/"disconnected" until the retry succeeds, so
      // the UI only reports "connecting" for the very first subscribe.
      const delay = immediate
        ? 0
        : Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) + Math.random() * 500;
      attempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        subscribe();
      }, delay);
    };

    const subscribe = () => {
      if (disposed) return;
      const ch = supabase.channel(`${name}:${channelKey}:${uniqueSuffix()}`);
      for (const binding of tablesRef.current) {
        const table = binding.table;
        ch.on(
          "postgres_changes",
          {
            event: binding.event ?? "*",
            schema: "public",
            table,
            ...(binding.filter ? { filter: binding.filter } : {}),
          },
          (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
            if (disposed || channel !== ch) return;
            onChangeRef.current(table, payload);
          },
        );
      }
      channel = ch;
      ch.subscribe((s) => {
        // Ignore callbacks from a channel we already replaced/removed.
        if (disposed || channel !== ch) return;
        if (s === "SUBSCRIBED") {
          attempt = 0;
          errored = false;
          setStatus("connected");
          // realtime-js also auto-rejoins after a socket drop and reports
          // SUBSCRIBED again — either way events may have been missed.
          if (subscribedOnce) resync(true);
          subscribedOnce = true;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          errored = true;
          setStatus(s === "CLOSED" ? "disconnected" : "error");
          scheduleRetry();
        }
      });
    };

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        hiddenAt = Date.now();
        return;
      }
      if (errored) scheduleRetry(true);
      // Background tabs get their sockets throttled; only a real absence
      // (not a quick alt-tab) is worth a refetch.
      if (errored || Date.now() - hiddenAt > HIDDEN_RESYNC_MS) resync();
    };
    const onOnline = () => {
      if (errored) scheduleRetry(true);
      // The resubscribe's SUBSCRIBED callback resyncs too; the throttle
      // collapses the two into one refetch.
      resync();
    };

    subscribe();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      if (retryTimer) clearTimeout(retryTimer);
      teardown();
    };
  }, [name, channelKey]);

  return channelKey ? status : "disconnected";
}
