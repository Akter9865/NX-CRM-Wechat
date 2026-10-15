"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Conversation } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeEvent<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
}

export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseRealtimeOptions {
  channelName: string;
  accountId?: string | null;
  onMessageEvent?: (event: RealtimeEvent<Message>) => void;
  onConversationEvent?: (event: RealtimeEvent<Conversation>) => void;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  enabled?: boolean;
}

export function useRealtime({
  channelName,
  accountId,
  onMessageEvent,
  onConversationEvent,
  onStatusChange,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [internalConnected, setInternalConnected] = useState(false);
  const [internalStatus, setInternalStatus] = useState<RealtimeConnectionStatus>("connecting");

  const isConnected = enabled ? internalConnected : false;
  const status: RealtimeConnectionStatus = enabled ? internalStatus : "disconnected";

  // Store latest callbacks in refs to avoid re-subscribing when parent re-renders
  const onMessageRef = useRef(onMessageEvent);
  const onConversationRef = useRef(onConversationEvent);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onMessageRef.current = onMessageEvent;
    onConversationRef.current = onConversationEvent;
    onStatusChangeRef.current = onStatusChange;
  });

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    // Account-scoped channel name to prevent cross-tenant noise
    const scopedTopic = accountId ? `${channelName}-${accountId}` : channelName;
    const channel = supabase.channel(scopedTopic);

    // Messages subscription
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      (payload) => {
        onMessageRef.current?.({
          eventType: payload.eventType as RealtimeEvent<Message>["eventType"],
          new: payload.new as Message,
          old: payload.old as Partial<Message>,
        });
      }
    );

    // Conversations subscription — scoped by account_id filter when available
    const convFilter = accountId ? `account_id=eq.${accountId}` : undefined;
    channel.on(
      "postgres_changes",
      convFilter
        ? { event: "*", schema: "public", table: "conversations", filter: convFilter }
        : { event: "*", schema: "public", table: "conversations" },
      (payload) => {
        onConversationRef.current?.({
          eventType: payload.eventType as RealtimeEvent<Conversation>["eventType"],
          new: payload.new as Conversation,
          old: payload.old as Partial<Conversation>,
        });
      }
    );

    channel.subscribe((subStatus) => {
      const isSubbed = subStatus === "SUBSCRIBED";
      setInternalConnected(isSubbed);

      let nextStatus: RealtimeConnectionStatus = "connecting";
      if (isSubbed) {
        nextStatus = "connected";
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
        nextStatus = "error";
      } else if (subStatus === "CLOSED") {
        nextStatus = "disconnected";
      }

      setInternalStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setInternalConnected(false);
      setInternalStatus("disconnected");
      onStatusChangeRef.current?.("disconnected");
    };
  }, [channelName, accountId, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setInternalConnected(false);
      setInternalStatus("disconnected");
      onStatusChangeRef.current?.("disconnected");
    }
  }, []);

  return { isConnected, status, unsubscribe };
}
