"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface WhatsAppConnectionItem {
  id: string;
  connection_name: string;
  phone_number_id: string;
  display_phone_number?: string;
  business_name?: string;
  quality_rating?: string;
  status?: string;
  is_default?: boolean;
  registered?: boolean;
  registration_error?: string;
  last_webhook_at?: string;
  is_automations_paused?: boolean;
}

export interface WhatsAppStatusState {
  connections: WhatsAppConnectionItem[];
  isConnected: boolean;
  isLoading: boolean;
  hasError: boolean;
  isBanned: boolean;
  isRestricted: boolean;
  isGlobalBotPaused: boolean;
  bannedCount: number;
  connectionCount: number;
  primaryConnection: WhatsAppConnectionItem | null;
  refetch: () => Promise<void>;
}

export const WHATSAPP_STATUS_CHANGED_EVENT = "wacrm:whatsapp-connections-changed";

export function dispatchWhatsAppStatusChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WHATSAPP_STATUS_CHANGED_EVENT));
  }
}

// ------------------------------------------------------------------
// Shared, de-duplicated store.
//
// This hook is mounted by the header, dashboard banner, settings,
// bot-reply page and more at the same time. Previously each instance
// fetched /api/whatsapp/connections on mount AND on every window focus,
// so one alt-tab fired 5–8 identical requests. Now every consumer reads
// one module-level snapshot; fetches are coalesced (one in flight at a
// time) and focus refreshes are throttled.
// ------------------------------------------------------------------

interface Snapshot {
  connections: WhatsAppConnectionItem[];
  isGlobalBotPausedFromServer: boolean;
  isLoading: boolean;
}

const FOCUS_REFRESH_MIN_MS = 30_000;
let snapshot: Snapshot = { connections: [], isGlobalBotPausedFromServer: false, isLoading: true };
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
let lastFetchedAt = 0;
let currentUserId: string | null = null;

function emit(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

function fetchShared(force = false): Promise<void> {
  if (!currentUserId) {
    emit({ connections: [], isLoading: false });
    return Promise.resolve();
  }
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastFetchedAt < FOCUS_REFRESH_MIN_MS && !snapshot.isLoading) {
    return Promise.resolve();
  }
  inFlight = (async () => {
    try {
      const res = await fetch("/api/whatsapp/connections", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) emit({ connections: [] });
        return;
      }
      const data = await res.json();
      emit({
        connections: data.connections || [],
        ...(typeof data.is_global_bot_paused === "boolean"
          ? { isGlobalBotPausedFromServer: data.is_global_bot_paused }
          : {}),
      });
    } catch {
      // Network blip — keep the last good snapshot.
    } finally {
      lastFetchedAt = Date.now();
      inFlight = null;
      emit({ isLoading: false });
    }
  })();
  return inFlight;
}

let windowListenersAttached = false;
function attachWindowListeners() {
  if (windowListenersAttached || typeof window === "undefined") return;
  windowListenersAttached = true;
  window.addEventListener(WHATSAPP_STATUS_CHANGED_EVENT, () => void fetchShared(true));
  window.addEventListener("focus", () => void fetchShared(false));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const getSnapshot = () => snapshot;
const SERVER_SNAPSHOT: Snapshot = { connections: [], isGlobalBotPausedFromServer: false, isLoading: true };
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useWhatsAppStatus(): WhatsAppStatusState {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { connections, isGlobalBotPausedFromServer, isLoading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    attachWindowListeners();
    if (userId !== currentUserId) {
      currentUserId = userId;
      lastFetchedAt = 0;
      void fetchShared(true);
    } else if (lastFetchedAt === 0) {
      void fetchShared(true);
    }
  }, [userId]);

  const refetch = useCallback(() => fetchShared(true), []);

  const isBanned = connections.some((c) => c.status === "banned");
  const isRestricted = connections.some((c) => c.status === "restricted");
  const bannedCount = connections.filter((c) => c.status === "banned").length;
  const isGlobalBotPaused =
    isGlobalBotPausedFromServer ||
    (connections.length > 0 && connections.every((c) => Boolean(c.is_automations_paused)));
  const isConnected = connections.length > 0 && connections.some((c) => c.status === "connected") && !isBanned && !isRestricted;
  const hasError = !isBanned && !isRestricted && connections.some((c) => c.status === "error" || Boolean(c.registration_error));
  const primaryConnection = connections.find((c) => c.is_default) || connections[0] || null;

  return {
    connections,
    isConnected,
    isLoading,
    hasError,
    isBanned,
    isRestricted,
    isGlobalBotPaused,
    bannedCount,
    connectionCount: connections.length,
    primaryConnection,
    refetch,
  };
}
