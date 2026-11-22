"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  useRealtimeChannel,
  type RealtimeConnectionStatus,
  type RealtimeRow,
} from "@/hooks/use-realtime";
import type { MessageReaction } from "@/types";
import {
  MESSAGE_PAGE_SIZE,
  MESSAGE_SELECT,
  confirmOptimistic,
  isTempId,
  patchByKey,
  removeByKey,
  upsertServerMessage,
  upsertServerMessages,
  type ThreadMessage,
} from "./messages";

interface ThreadState {
  convId: string | null;
  messages: ThreadMessage[];
  reactions: MessageReaction[];
  /** First page has arrived. */
  loaded: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  /**
   * Bumped each time older history is prepended, so the view can restore
   * the scroll offset in a layout effect.
   */
  prependSeq: number;
  error: boolean;
}

function emptyState(convId: string | null): ThreadState {
  return {
    convId,
    messages: [],
    reactions: [],
    loaded: false,
    hasOlder: false,
    loadingOlder: false,
    prependSeq: 0,
    error: false,
  };
}

/** Realtime rows include `raw_payload` (full Meta JSON); never keep it in memory. */
function stripRow(row: RealtimeRow): ThreadMessage {
  const { raw_payload: _raw, ...rest } = row as RealtimeRow & { raw_payload?: unknown };
  return rest as unknown as ThreadMessage;
}

function sameReactions(a: MessageReaction[], b: MessageReaction[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].emoji !== b[i].emoji ||
      a[i].message_id !== b[i].message_id ||
      a[i].actor_id !== b[i].actor_id
    ) {
      return false;
    }
  }
  return true;
}

async function fetchReactions(conversationId: string, messageIds: string[]) {
  const ids = messageIds.filter((id) => !isTempId(id));
  if (ids.length === 0) return [] as MessageReaction[];
  const { data, error } = await createClient()
    .from("message_reactions")
    .select("*")
    .eq("conversation_id", conversationId)
    .in("message_id", ids);
  if (error) throw error;
  return (data as MessageReaction[]) ?? [];
}

async function fetchLatest(conversationId: string) {
  const { data, error } = await createClient()
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (error) throw error;
  return ((data ?? []) as ThreadMessage[]).reverse();
}

export interface ThreadMessagesState {
  messages: ThreadMessage[];
  reactions: MessageReaction[];
  loading: boolean;
  error: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  prependSeq: number;
  status: RealtimeConnectionStatus;
  loadOlder: () => void;
  resync: () => void;
  addOptimistic: (msg: ThreadMessage) => void;
  confirm: (key: string, result: { id?: string | null; message_id?: string | null }) => void;
  fail: (key: string, error: string) => void;
  patchMessage: (key: string, patch: Partial<ThreadMessage>) => void;
  discard: (key: string) => void;
  setReactions: (fn: (prev: MessageReaction[]) => MessageReaction[]) => void;
}

/**
 * Messages + reactions for ONE conversation. Loads the latest page, pages
 * older history on demand, and listens on a Realtime channel filtered to
 * `conversation_id=eq.<id>` (messages + message_reactions) that is rebuilt
 * whenever the active conversation changes.
 */
export function useThreadMessages(conversationId: string | null): ThreadMessagesState {
  const [state, setState] = useState<ThreadState>(() => emptyState(conversationId));

  const convIdRef = useRef(conversationId);
  const stateRef = useRef(state);
  useEffect(() => {
    convIdRef.current = conversationId;
    stateRef.current = state;
  });

  // Optimistic messages that haven't been confirmed yet, per conversation.
  // Kept outside the per-conversation state so a "sending" or "failed"
  // bubble (and its text) survives the agent switching threads and back.
  const pendingRef = useRef(new Map<string, Map<string, ThreadMessage>>());
  const setPending = useCallback(
    (convId: string, key: string, msg: ThreadMessage | null) => {
      let bucket = pendingRef.current.get(convId);
      if (!msg) {
        bucket?.delete(key);
        if (bucket && bucket.size === 0) pendingRef.current.delete(convId);
        return;
      }
      if (!bucket) {
        bucket = new Map();
        pendingRef.current.set(convId, bucket);
      }
      bucket.set(key, msg);
    },
    [],
  );

  /**
   * Run `fn` against `convId`'s state. Results for a conversation the user
   * already navigated away from are dropped; the first write for the
   * current conversation starts from a fresh state (seeded with any of its
   * still-pending optimistic messages).
   */
  const update = useCallback(
    (convId: string, fn: (s: ThreadState) => ThreadState) => {
      setState((prev) => {
        if (prev.convId === convId) return fn(prev);
        if (convId !== convIdRef.current) return prev;
        const pending = pendingRef.current.get(convId);
        return fn({
          ...emptyState(convId),
          messages: pending ? Array.from(pending.values()) : [],
        });
      });
    },
    [],
  );

  // ---- initial page ------------------------------------------------------
  const [reloadSeq, setReloadSeq] = useState(0);
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const rows = await fetchLatest(conversationId);
        if (cancelled) return;
        update(conversationId, (s) => ({
          ...s,
          // Merge, don't replace: optimistic bubbles and realtime rows
          // that landed while the fetch was in flight must survive.
          messages: upsertServerMessages(s.messages, rows),
          loaded: true,
          error: false,
          hasOlder: rows.length === MESSAGE_PAGE_SIZE,
        }));
        const reactions = await fetchReactions(
          conversationId,
          rows.map((r) => r.id),
        );
        if (cancelled) return;
        update(conversationId, (s) =>
          sameReactions(s.reactions, reactions) ? s : { ...s, reactions },
        );
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        if (!cancelled) update(conversationId, (s) => ({ ...s, loaded: true, error: true }));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [conversationId, reloadSeq, update]);

  // ---- older history -------------------------------------------------------
  const loadingOlderRef = useRef(false);
  const loadOlder = useCallback(() => {
    const convId = convIdRef.current;
    const s = stateRef.current;
    if (!convId || s.convId !== convId || !s.hasOlder || loadingOlderRef.current) {
      return;
    }
    const before = s.messages.find((m) => !isTempId(m.id))?.created_at;
    if (!before) return;
    loadingOlderRef.current = true;
    update(convId, (st) => ({ ...st, loadingOlder: true }));
    const run = async () => {
      try {
        const { data, error } = await createClient()
          .from("messages")
          .select(MESSAGE_SELECT)
          .eq("conversation_id", convId)
          .lt("created_at", before)
          .order("created_at", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);
        if (error) throw error;
        const rows = ((data ?? []) as ThreadMessage[]).reverse();
        update(convId, (st) => {
          const known = new Set(st.messages.map((m) => m.id));
          const fresh = rows.filter((r) => !known.has(r.id));
          return {
            ...st,
            messages: fresh.length ? [...fresh, ...st.messages] : st.messages,
            hasOlder: rows.length === MESSAGE_PAGE_SIZE,
            loadingOlder: false,
            prependSeq: fresh.length ? st.prependSeq + 1 : st.prependSeq,
          };
        });
        const reactions = await fetchReactions(convId, rows.map((r) => r.id));
        if (reactions.length) {
          update(convId, (st) => {
            const have = new Set(st.reactions.map((r) => r.id));
            const add = reactions.filter((r) => !have.has(r.id));
            return add.length ? { ...st, reactions: [...st.reactions, ...add] } : st;
          });
        }
      } catch (err) {
        console.error("Failed to load older messages:", err);
        update(convId, (st) => ({ ...st, loadingOlder: false }));
      } finally {
        loadingOlderRef.current = false;
      }
    };
    void run();
  }, [update]);

  // ---- gap fill -------------------------------------------------------------
  const resync = useCallback(() => {
    const convId = convIdRef.current;
    if (!convId) return;
    const run = async () => {
      try {
        const rows = await fetchLatest(convId);
        update(convId, (s) => {
          if (!s.loaded) return s; // initial fetch still owns this
          const confirmed = s.messages.filter((m) => !isTempId(m.id));
          const newestKnown = confirmed[confirmed.length - 1]?.created_at;
          const oldestFetched = rows[0]?.created_at;
          const gapTooBig =
            rows.length === MESSAGE_PAGE_SIZE &&
            !!newestKnown &&
            !!oldestFetched &&
            Date.parse(oldestFetched) > Date.parse(newestKnown);
          if (gapTooBig) {
            // More than a page arrived while we were away: restart history
            // from this page rather than show a silent hole.
            return {
              ...s,
              messages: upsertServerMessages(
                s.messages.filter((m) => isTempId(m.id)),
                rows,
              ),
              hasOlder: true,
            };
          }
          const merged = upsertServerMessages(s.messages, rows);
          return merged === s.messages ? s : { ...s, messages: merged };
        });
        const reactions = await fetchReactions(convId, rows.map((r) => r.id));
        update(convId, (s) => {
          const fetchedIds = new Set(rows.map((r) => r.id));
          const keep = s.reactions.filter(
            (r) => !fetchedIds.has(r.message_id) || isTempId(r.id),
          );
          const next = [...keep, ...reactions];
          return sameReactions(s.reactions, next) ? s : { ...s, reactions: next };
        });
      } catch (err) {
        console.error("Thread resync failed:", err);
      }
    };
    void run();
  }, [update]);

  // ---- realtime --------------------------------------------------------------
  const handleEvent = useCallback(
    (table: string, payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
      const convId = convIdRef.current;
      if (!convId) return;

      if (table === "messages") {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;
          update(convId, (s) => {
            const next = s.messages.filter((m) => m.id !== id);
            return next.length === s.messages.length ? s : { ...s, messages: next };
          });
          return;
        }
        const row = stripRow(payload.new);
        if (row.conversation_id !== convId) return;
        update(convId, (s) => {
          const next = upsertServerMessage(s.messages, row);
          return next === s.messages ? s : { ...s, messages: next };
        });
        return;
      }

      if (table === "message_reactions") {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;
          update(convId, (s) => ({
            ...s,
            reactions: s.reactions.filter((r) => r.id !== id),
          }));
          return;
        }
        const row = payload.new as unknown as MessageReaction;
        update(convId, (s) => {
          const prev = s.reactions;
          const existing = prev.findIndex((r) => r.id === row.id);
          if (existing >= 0) {
            const copy = prev.slice();
            copy[existing] = row;
            return { ...s, reactions: copy };
          }
          // Swap a matching optimistic temp row so the pill doesn't double up.
          const tempIdx = prev.findIndex(
            (r) =>
              isTempId(r.id) &&
              r.message_id === row.message_id &&
              r.actor_type === row.actor_type &&
              r.actor_id === row.actor_id,
          );
          if (tempIdx >= 0) {
            const copy = prev.slice();
            copy[tempIdx] = row;
            return { ...s, reactions: copy };
          }
          return { ...s, reactions: [...prev, row] };
        });
      }
    },
    [update],
  );

  const tables = useMemo(
    () =>
      conversationId
        ? [
            { table: "messages", filter: `conversation_id=eq.${conversationId}` },
            {
              table: "message_reactions",
              filter: `conversation_id=eq.${conversationId}`,
            },
          ]
        : [],
    [conversationId],
  );

  const status = useRealtimeChannel({
    name: "inbox-thread",
    channelKey: conversationId,
    tables,
    onChange: handleEvent,
    onResync: resync,
  });

  // ---- optimistic API ----------------------------------------------------------
  const addOptimistic = useCallback(
    (msg: ThreadMessage) => {
      const key = msg.client_key ?? msg.id;
      setPending(msg.conversation_id, key, msg);
      update(msg.conversation_id, (s) => ({ ...s, messages: [...s.messages, msg] }));
    },
    [update, setPending],
  );

  const forgetPending = useCallback((key: string) => {
    for (const [convId, bucket] of pendingRef.current) {
      if (bucket.has(key)) {
        bucket.delete(key);
        if (bucket.size === 0) pendingRef.current.delete(convId);
        return;
      }
    }
  }, []);

  const confirm = useCallback(
    (key: string, result: { id?: string | null; message_id?: string | null }) => {
      forgetPending(key);
      setState((s) => {
        const next = confirmOptimistic(s.messages, key, result);
        return next === s.messages ? s : { ...s, messages: next };
      });
    },
    [forgetPending],
  );

  const patchMessage = useCallback((key: string, p: Partial<ThreadMessage>) => {
    for (const bucket of pendingRef.current.values()) {
      const cur = bucket.get(key);
      if (cur) {
        bucket.set(key, { ...cur, ...p });
        break;
      }
    }
    setState((s) => {
      const next = patchByKey(s.messages, key, p);
      return next === s.messages ? s : { ...s, messages: next };
    });
  }, []);

  /**
   * Mark an optimistic send as failed — unless the realtime INSERT already
   * reconciled it with a real server row (the API timed out but the send
   * actually went through), in which case the row stays as the server says.
   */
  const fail = useCallback((key: string, error: string) => {
    for (const bucket of pendingRef.current.values()) {
      const cur = bucket.get(key);
      if (cur) {
        bucket.set(key, { ...cur, status: "failed", error_message: error });
        break;
      }
    }
    setState((s) => {
      const idx = s.messages.findIndex((m) => m.client_key === key);
      if (idx < 0 || !isTempId(s.messages[idx].id)) return s;
      const next = s.messages.slice();
      next[idx] = { ...next[idx], status: "failed", error_message: error };
      return { ...s, messages: next };
    });
  }, []);

  const discard = useCallback(
    (key: string) => {
      forgetPending(key);
      setState((s) => {
        const next = removeByKey(s.messages, key);
        return next === s.messages ? s : { ...s, messages: next };
      });
    },
    [forgetPending],
  );

  const setReactions = useCallback(
    (fn: (prev: MessageReaction[]) => MessageReaction[]) => {
      setState((s) => {
        const next = fn(s.reactions);
        return next === s.reactions ? s : { ...s, reactions: next };
      });
    },
    [],
  );

  const view = state.convId === conversationId ? state : emptyState(conversationId);

  const retryInitial = useCallback(() => setReloadSeq((n) => n + 1), []);

  return {
    messages: view.messages,
    reactions: view.reactions,
    loading: !!conversationId && !view.loaded,
    error: view.error,
    hasOlder: view.hasOlder,
    loadingOlder: view.loadingOlder,
    prependSeq: view.prependSeq,
    status,
    loadOlder,
    resync: view.error ? retryInitial : resync,
    addOptimistic,
    confirm,
    fail,
    patchMessage,
    discard,
    setReactions,
  };
}
