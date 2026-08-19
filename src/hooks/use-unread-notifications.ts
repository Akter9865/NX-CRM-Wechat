"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";

/**
 * Count of unread notifications for the current user. Used by the
 * sidebar and header to surface a badge on the Notifications entry.
 */
export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { count: unreadCount, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .is("read_at", null);
      if (cancelled || error) return;
      setCount(unreadCount ?? 0);
    })();

    // Use a unique channel instance topic to prevent collision between simultaneous consumers (Sidebar & Header)
    const channelName = `notifications-unread-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Notification;
            if (!row.read_at) setCount((n) => n + 1);
          } else if (payload.eventType === "UPDATE") {
            const newRow = payload.new as Notification;
            if (newRow.read_at) setCount((n) => Math.max(0, n - 1));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Notification>;
            if (!oldRow.read_at) setCount((n) => Math.max(0, n - 1));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
