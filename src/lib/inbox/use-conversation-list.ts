"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  useRealtimeChannel,
  type RealtimeConnectionStatus,
  type RealtimeRow,
} from "@/hooks/use-realtime";
import {
  CONVERSATION_SELECT,
  normalizeConversation,
  normalizeConversations,
} from "./conversations";
import type { InboxConversation } from "./session-window";

export type InboxFilter =
  | "all"
  | "unread"
  | "mine"
  | "unassigned"
  | "open"
  | "pending"
  | "closed";

export const CONVERSATION_PAGE_SIZE = 40;

/** Client-side mirror of the server filter in {@link fetchConversationPage}. */
export function matchesInboxFilter(
  c: InboxConversation,
  filter: InboxFilter,
  userId: string | null | undefined,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unread":
      return (c.unread_count ?? 0) > 0;
    case "mine":
      return !!userId && c.assigned_agent_id === userId;
    case "unassigned":
      return !c.assigned_agent_id;
    default:
      return c.status === filter;
  }
}

function ts(value: string | null | undefined): number {
  const n = value ? Date.parse(value) : NaN;
  return Number.isNaN(n) ? 0 : n;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "object" && typeof b === "object" && a && b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/** Return `prev` when `next` carries nothing new, so memoised rows skip re-rendering. */
function keepIfSame(prev: InboxConversation, next: InboxConversation): InboxConversation {
  const a = prev as unknown as Record<string, unknown>;
  const b = next as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!sameValue(a[k], b[k])) return next;
  }
  return prev;
}

interface PageState {
  /** `last_message_at` of the last row fetched for this filter. */
  cursor: string | null;
  hasMore: boolean;
  loaded: boolean;
  error: boolean;
}

interface UseConversationListOptions {
  accountId: string | null;
  userId: string | null;
  filter: InboxFilter;
  /** Debounced search text; ≥2 chars triggers a server-side contact search. */
  search: string;
  activeId: string | null;
  /** Fired when a conversation receives a new customer message. */
  onInbound?: (conversation: InboxConversation, isActive: boolean) => void;
}

export interface ConversationListState {
  /** Every known conversation, newest first. Filtering is the caller's job. */
  conversations: InboxConversation[];
  byId: Map<string, InboxConversation>;
  /** First page for the current filter hasn't arrived yet. */
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /**
   * Rows older than this (epoch ms) are outside the window paged in for the
   * current filter and should be hidden until "load more" reaches them —
   * otherwise a row hydrated by realtime would sit below a gap.
   */
  visibleSince: number | null;
  searching: boolean;
  status: RealtimeConnectionStatus;
  loadMore: () => void;
  resync: () => void;
  /** Ensure a conversation is in the store (deep links, hydrate after INSERT). */
  ensure: (id: string) => void;
  /** Optimistic local patch (status/assignment changes). */
  patch: (id: string, patch: Partial<InboxConversation>) => void;
  markRead: (id: string) => void;
}

/**
 * Conversation list data for the Inbox: paginated per filter, kept live by
 * a `conversations` Realtime channel filtered by `account_id` (that table
 * already carries last_message_text / last_message_at / unread_count, so
 * the list never needs the far noisier `messages` stream).
 */
export function useConversationList({
  accountId,
  userId,
  filter,
  search,
  activeId,
  onInbound,
}: UseConversationListOptions): ConversationListState {
  const [store, setStore] = useState<Map<string, InboxConversation>>(
    () => new Map(),
  );
  const [pages, setPages] = useState<Record<string, PageState>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchedFor, setSearchedFor] = useState("");

  // Synchronous mirror of `store`. Every write goes through `commit`, which
  // computes the next map from the ref and updates both — so event handlers
  // can ask "do we already have this conversation?" without waiting for a
  // render (the bug behind issues #105/#106).
  const storeRef = useRef(store);
  const commit = useCallback(
    (fn: (prev: Map<string, InboxConversation>) => Map<string, InboxConversation>) => {
      const prev = storeRef.current;
      const next = fn(prev);
      if (next !== prev) {
        storeRef.current = next;
        setStore(next);
      }
    },
    [],
  );

  const activeIdRef = useRef(activeId);
  const onInboundRef = useRef(onInbound);
  const filterRef = useRef(filter);
  const pagesRef = useRef(pages);
  useEffect(() => {
    activeIdRef.current = activeId;
    onInboundRef.current = onInbound;
    filterRef.current = filter;
    pagesRef.current = pages;
  });

  // ---- mark read -------------------------------------------------------
  const markReadInflight = useRef(new Set<string>());
  const markReadAgain = useRef(new Set<string>());
  const markRead = useCallback(
    (id: string) => {
      commit((prev) => {
        const c = prev.get(id);
        if (!c || !c.unread_count) return prev;
        const next = new Map(prev);
        next.set(id, { ...c, unread_count: 0 });
        return next;
      });
      if (markReadInflight.current.has(id)) {
        // An inbound bumped the server count while our reset was in
        // flight; run once more afterwards so the server ends at 0 too.
        markReadAgain.current.add(id);
        return;
      }
      markReadInflight.current.add(id);
      const run = async () => {
        try {
          const { error } = await createClient()
            .from("conversations")
            .update({ unread_count: 0 })
            .eq("id", id);
          if (error) console.error("Failed to reset unread_count:", error.message);
        } catch (err) {
          console.error("Failed to reset unread_count:", err);
        } finally {
          markReadInflight.current.delete(id);
          if (markReadAgain.current.delete(id)) markRead(id);
        }
      };
      void run();
    },
    [commit],
  );

  /** The active conversation never shows an unread badge while the tab is visible. */
  const suppressActiveUnread = useCallback(
    (row: InboxConversation): InboxConversation => {
      if (
        row.id === activeIdRef.current &&
        (row.unread_count ?? 0) > 0 &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        queueMicrotask(() => markRead(row.id));
        return { ...row, unread_count: 0 };
      }
      return row;
    },
    [markRead],
  );

  /** Merge authoritative rows (fetches) into the store. */
  const mergeRows = useCallback(
    (rows: InboxConversation[]) => {
      if (rows.length === 0) return;
      commit((prev) => {
        let next: Map<string, InboxConversation> | null = null;
        for (const raw of rows) {
          const existing = prev.get(raw.id);
          const candidate = suppressActiveUnread({
            ...existing,
            ...raw,
            contact: raw.contact ?? existing?.contact,
          } as InboxConversation);
          const merged = existing ? keepIfSame(existing, candidate) : candidate;
          if (merged !== existing) {
            next ??= new Map(prev);
            next.set(raw.id, merged);
          }
        }
        return next ?? prev;
      });
    },
    [commit, suppressActiveUnread],
  );

  // ---- fetching ---------------------------------------------------------
  const fetchPage = useCallback(
    async (f: InboxFilter, cursor: string | null) => {
      if (!accountId) return [];
      let q = createClient()
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .eq("account_id", accountId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(CONVERSATION_PAGE_SIZE);
      switch (f) {
        case "unread":
          q = q.gt("unread_count", 0);
          break;
        case "mine":
          if (!userId) return [];
          q = q.eq("assigned_agent_id", userId);
          break;
        case "unassigned":
          q = q.is("assigned_agent_id", null);
          break;
        case "open":
        case "pending":
        case "closed":
          q = q.eq("status", f);
          break;
      }
      // `lte` + id dedupe (rather than `lt`) so rows sharing the boundary
      // timestamp aren't skipped.
      if (cursor) q = q.lte("last_message_at", cursor);
      const { data, error } = await q;
      if (error) throw error;
      return normalizeConversations(data ?? []) as InboxConversation[];
    },
    [accountId, userId],
  );

  const inflightPages = useRef(new Set<string>());
  const loadPage = useCallback(
    async (f: InboxFilter, reset: boolean) => {
      const key = f;
      if (inflightPages.current.has(key)) return;
      const page = pagesRef.current[key];
      if (!reset && page && !page.hasMore) return;
      inflightPages.current.add(key);
      const isMore = !reset && !!page?.loaded;
      if (isMore) setLoadingMore(true);
      try {
        const cursor = reset ? null : (page?.cursor ?? null);
        const rows = await fetchPage(f, cursor);
        const known = storeRef.current;
        const newCount = rows.filter((r) => !known.has(r.id)).length;
        mergeRows(rows);
        const last = rows[rows.length - 1];
        setPages((prev) => {
          const before = prev[key];
          // A reset (resync) must not shrink a window the user already
          // paged past — keep the older cursor in that case.
          const keepOld =
            reset && before?.loaded && before.cursor && last?.last_message_at &&
            ts(before.cursor) < ts(last.last_message_at);
          return {
            ...prev,
            [key]: keepOld
              ? { ...before, error: false }
              : {
                  cursor: last?.last_message_at ?? before?.cursor ?? null,
                  hasMore:
                    rows.length === CONVERSATION_PAGE_SIZE &&
                    (reset || newCount > 0),
                  loaded: true,
                  error: false,
                },
          };
        });
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
        setPages((prev) => ({
          ...prev,
          [key]: {
            cursor: prev[key]?.cursor ?? null,
            hasMore: prev[key]?.hasMore ?? false,
            loaded: true,
            error: true,
          },
        }));
      } finally {
        inflightPages.current.delete(key);
        if (isMore) setLoadingMore(false);
      }
    },
    [fetchPage, mergeRows],
  );

  // First page per filter, once.
  useEffect(() => {
    if (!accountId) return;
    if (pagesRef.current[filter]?.loaded) return;
    void loadPage(filter, true);
  }, [accountId, filter, loadPage]);

  const hydrating = useRef(new Set<string>());
  const ensure = useCallback(
    (id: string) => {
      if (!accountId || hydrating.current.has(id)) return;
      const existing = storeRef.current.get(id);
      if (existing?.contact) return;
      hydrating.current.add(id);
      const run = async () => {
        try {
          const { data, error } = await createClient()
            .from("conversations")
            .select(CONVERSATION_SELECT)
            .eq("id", id)
            .maybeSingle();
          if (error) {
            console.error("Failed to hydrate conversation:", error.message);
            return;
          }
          if (!data) return;
          const fetched = normalizeConversation(data) as InboxConversation;
          commit((prev) => {
            const cur = prev.get(id);
            const next = new Map(prev);
            // Keep any fresher realtime fields already in state; only
            // backfill the joins realtime payloads never carry.
            next.set(
              id,
              cur
                ? {
                    ...cur,
                    contact: cur.contact ?? fetched.contact,
                    whatsapp_connection:
                      cur.whatsapp_connection ?? fetched.whatsapp_connection,
                  }
                : suppressActiveUnread(fetched),
            );
            return next;
          });
        } catch (err) {
          console.error("Failed to hydrate conversation:", err);
        } finally {
          hydrating.current.delete(id);
        }
      };
      void run();
    },
    [accountId, commit, suppressActiveUnread],
  );

  // ---- search (server-side, by contact name / phone) ---------------------
  useEffect(() => {
    const q = search.trim();
    if (!accountId || q.length < 2) return;
    let cancelled = false;
    const run = async () => {
      try {
        const supabase = createClient();
        // Characters with meaning in PostgREST's `or=(…)` grammar.
        const safe = q.replace(/[%_,()*\\]/g, " ").trim();
        const digits = q.replace(/\D/g, "");
        const ors = [`name.ilike.%${safe}%`];
        if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
        else ors.push(`phone.ilike.%${safe}%`);
        const { data: contacts, error: cErr } = await supabase
          .from("contacts")
          .select("id")
          .eq("account_id", accountId)
          .or(ors.join(","))
          .limit(50);
        if (cErr) throw cErr;
        const ids = (contacts ?? []).map((c: { id: string }) => c.id);
        if (ids.length > 0) {
          const { data, error } = await supabase
            .from("conversations")
            .select(CONVERSATION_SELECT)
            .eq("account_id", accountId)
            .in("contact_id", ids)
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(50);
          if (error) throw error;
          if (!cancelled) mergeRows(normalizeConversations(data ?? []) as InboxConversation[]);
        }
      } catch (err) {
        console.error("Conversation search failed:", err);
      } finally {
        if (!cancelled) setSearchedFor(q);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [accountId, search, mergeRows]);

  // ---- realtime ----------------------------------------------------------
  const handleEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: string }).id;
        if (!id) return;
        commit((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const row = payload.new as unknown as InboxConversation;
      if (!row?.id) return;
      const prevRow = storeRef.current.get(row.id);

      const inbound =
        (row.unread_count ?? 0) > (prevRow?.unread_count ?? 0) ||
        (!!row.last_customer_message_at &&
          !!prevRow &&
          row.last_customer_message_at !== prevRow.last_customer_message_at);

      if (prevRow) {
        commit((prev) => {
          const cur = prev.get(row.id);
          if (!cur) return prev;
          // Realtime rows carry only the table's own columns, so the
          // `contact` / `whatsapp_connection` joins survive the spread.
          const merged = keepIfSame(cur, suppressActiveUnread({ ...cur, ...row }));
          if (merged === cur) return prev;
          const next = new Map(prev);
          next.set(row.id, merged);
          return next;
        });
      } else {
        // Unknown row. New conversations (INSERT, or an UPDATE that
        // bumped it into the loaded window) surface at once and are
        // hydrated for their contact join. Status edits on ancient rows
        // outside the window are ignored until paging reaches them.
        let oldest = Infinity;
        for (const c of storeRef.current.values()) {
          oldest = Math.min(oldest, ts(c.last_message_at));
        }
        const inWindow =
          payload.eventType === "INSERT" ||
          storeRef.current.size < CONVERSATION_PAGE_SIZE ||
          ts(row.last_message_at) >= oldest;
        if (!inWindow) return;
        commit((prev) => {
          if (prev.has(row.id)) return prev;
          const next = new Map(prev);
          next.set(row.id, suppressActiveUnread(row));
          return next;
        });
        ensure(row.id);
      }

      if (inbound || (!prevRow && (row.unread_count ?? 0) > 0)) {
        onInboundRef.current?.(row, row.id === activeIdRef.current);
      }
    },
    [commit, ensure, suppressActiveUnread],
  );

  const resync = useCallback(() => {
    void loadPage(filterRef.current, true);
    const active = activeIdRef.current;
    if (active && !storeRef.current.has(active)) ensure(active);
  }, [loadPage, ensure]);

  const tables = useMemo(
    () =>
      accountId
        ? [{ table: "conversations", filter: `account_id=eq.${accountId}` }]
        : [],
    [accountId],
  );

  const status = useRealtimeChannel({
    name: "inbox-conversations",
    channelKey: accountId,
    tables,
    onChange: (_table, payload) => handleEvent(payload),
    onResync: resync,
  });

  // When the agent returns to the tab, clear the badge of the thread they're looking at.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const id = activeIdRef.current;
      if (id && (storeRef.current.get(id)?.unread_count ?? 0) > 0) markRead(id);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  const patch = useCallback(
    (id: string, p: Partial<InboxConversation>) => {
      commit((prev) => {
        const cur = prev.get(id);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(id, { ...cur, ...p });
        return next;
      });
    },
    [commit],
  );

  const loadMore = useCallback(() => {
    void loadPage(filterRef.current, false);
  }, [loadPage]);

  const conversations = useMemo(() => {
    const arr = Array.from(store.values());
    arr.sort((a, b) => ts(b.last_message_at) - ts(a.last_message_at));
    return arr;
  }, [store]);

  const page = pages[filter];
  const searchActive = search.trim().length >= 2;

  return {
    conversations,
    byId: store,
    loading: !page?.loaded,
    loadingMore,
    hasMore: !!page?.hasMore && !searchActive,
    visibleSince:
      !searchActive && page?.hasMore && page.cursor ? ts(page.cursor) : null,
    searching: searchActive && searchedFor !== search.trim(),
    status,
    loadMore,
    resync,
    ensure,
    patch,
    markRead,
  };
}
