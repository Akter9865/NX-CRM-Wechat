"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeChannel, type RealtimeRow } from "@/hooks/use-realtime";

async function fetchUnreadCounts(accountId: string): Promise<Map<string, number> | null> {
  const { data, error } = await createClient()
    .from("conversations")
    .select("id, unread_count")
    .eq("account_id", accountId)
    .gt("unread_count", 0)
    .limit(1000);
  if (error || !data) return null;
  const map = new Map<string, number>();
  for (const row of data as { id: string; unread_count: number | null }[]) {
    map.set(row.id, row.unread_count ?? 0);
  }
  return map;
}

/**
 * Count of conversations with at least one unread inbound message for
 * the current account. Used by the sidebar to surface a dot on the
 * Inbox nav entry when the user is elsewhere in the app.
 *
 * Scoped to the account on both the query and the Realtime filter — the
 * previous version subscribed to every `conversations` change visible to
 * the user and selected every conversation row on mount.
 */
export function useTotalUnread(): number {
  const { accountId } = useAuth();
  const [total, setTotal] = useState(0);
  // conversation id → unread_count, only for rows with unread > 0.
  const countsRef = useRef<Map<string, number>>(new Map());

  const recount = useCallback(() => {
    let sum = 0;
    for (const n of countsRef.current.values()) if (n > 0) sum += 1;
    setTotal(sum);
  }, []);

  const apply = useCallback(
    (map: Map<string, number>) => {
      countsRef.current = map;
      recount();
    },
    [recount],
  );

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchUnreadCounts(accountId)
      .then((map) => {
        if (!cancelled && map) apply(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, apply]);

  const tables = useMemo(
    () =>
      accountId
        ? [{ table: "conversations", filter: `account_id=eq.${accountId}` }]
        : [],
    [accountId],
  );

  useRealtimeChannel({
    name: "total-unread",
    channelKey: accountId,
    tables,
    onChange: (_table, payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
      const map = countsRef.current;
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: string }).id;
        if (id && map.delete(id)) recount();
        return;
      }
      const row = payload.new as { id?: string; unread_count?: number | null };
      if (!row.id) return;
      const n = row.unread_count ?? 0;
      const had = map.get(row.id) ?? 0;
      if (n > 0) map.set(row.id, n);
      else map.delete(row.id);
      if ((had > 0) !== (n > 0)) recount();
    },
    onResync: () => {
      if (!accountId) return;
      fetchUnreadCounts(accountId)
        .then((map) => {
          if (map) apply(map);
        })
        .catch(() => {});
    },
  });

  return accountId ? total : 0;
}
