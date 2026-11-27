import type { Message, MessageStatus } from "@/types";

/**
 * Column list for thread fetches. Deliberately NOT `*`: `raw_payload`
 * holds the full Meta webhook JSON for every inbound row and is never
 * rendered, so pulling it made each page of history several times larger
 * than it needed to be.
 */
export const MESSAGE_SELECT =
  "id, conversation_id, sender_type, sender_id, content_type, content_text, media_url, media_type, template_name, message_id, status, created_at, reply_to_message_id, interactive_reply_id, interactive_payload, ai_generated, error_message, channel_type";

/** Page size for thread history (initial load and each "load older"). */
export const MESSAGE_PAGE_SIZE = 50;

/**
 * A message as the thread holds it. Adds two client-only fields on top of
 * the DB row shape:
 *  - `client_key` — the temp id of a message this tab sent. It survives
 *    reconciliation with the server row so the bubble's React key never
 *    changes (no remount / flicker / media reload when the real id lands).
 *  - `error_message` — why a send failed (API error, or the row's own
 *    `error_message` column when Meta reports a failure later).
 */
export interface ThreadMessage extends Message {
  client_key?: string;
  error_message?: string | null;
}

export const TEMP_ID_PREFIX = "temp-";

export function isTempId(id: string | undefined | null): boolean {
  return typeof id === "string" && id.startsWith(TEMP_ID_PREFIX);
}

let tempCounter = 0;
export function newTempId(): string {
  tempCounter += 1;
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${TEMP_ID_PREFIX}${rand}-${tempCounter}`;
}

/** Stable React key for a thread row. */
export function messageKey(m: ThreadMessage): string {
  return m.client_key ?? m.id;
}

const STATUS_RANK: Record<MessageStatus, number> = {
  sending: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

/**
 * Status precedence when two sources disagree. Ticks only move forward
 * (a late "sent" event must not knock a "read" message back to one tick),
 * except that a server-reported failure always wins and a server row
 * always clears a client-side failure.
 */
export function mergeStatus(
  current: MessageStatus | undefined,
  incoming: MessageStatus | undefined,
): MessageStatus {
  if (!incoming) return current ?? "sent";
  if (!current) return incoming;
  if (incoming === "failed") return "failed";
  if (current === "failed") return incoming;
  return (STATUS_RANK[incoming] ?? 0) >= (STATUS_RANK[current] ?? 0)
    ? incoming
    : current;
}

function ts(value: string | undefined): number {
  const n = value ? Date.parse(value) : NaN;
  return Number.isNaN(n) ? 0 : n;
}

function sameContent(a: ThreadMessage, b: ThreadMessage): boolean {
  if (a.content_type !== b.content_type) return false;
  switch (a.content_type) {
    case "image":
    case "video":
    case "audio":
    case "document":
      return !!a.media_url && a.media_url === b.media_url;
    case "template":
      return !!a.template_name && a.template_name === b.template_name;
    default:
      return (a.content_text ?? "").trim() === (b.content_text ?? "").trim();
  }
}

/**
 * Index of the optimistic bubble a freshly-inserted server row belongs to,
 * or -1. Used when the realtime INSERT beats the send API's response (so
 * we don't know the real id yet). Matching is strict — same sender type,
 * same kind, same body / media / template — so an automation message that
 * happens to land at the same moment is never mistaken for ours.
 */
function findOptimisticMatch(list: ThreadMessage[], row: ThreadMessage): number {
  if (row.sender_type === "customer") return -1;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!isTempId(m.id)) continue;
    if (m.status !== "sending" && m.status !== "failed") continue;
    if (m.sender_type !== row.sender_type) continue;
    if (m.conversation_id !== row.conversation_id) continue;
    if (sameContent(m, row)) return i;
  }
  return -1;
}

function shallowEqual(a: ThreadMessage, b: ThreadMessage): boolean {
  const ka = Object.keys(a) as (keyof ThreadMessage)[];
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (a[k] !== b[k]) {
      // interactive_payload is an object; treat structurally equal JSON as equal
      if (
        typeof a[k] === "object" &&
        a[k] !== null &&
        typeof b[k] === "object" &&
        b[k] !== null &&
        JSON.stringify(a[k]) === JSON.stringify(b[k])
      ) {
        continue;
      }
      return false;
    }
  }
  return true;
}

function mergeMessage(cur: ThreadMessage, row: ThreadMessage): ThreadMessage {
  const merged: ThreadMessage = {
    ...cur,
    ...row,
    status: mergeStatus(cur.status, row.status),
  };
  if (cur.client_key) merged.client_key = cur.client_key;
  // A server row that isn't failed clears any client-side failure text.
  if (merged.status !== "failed" && cur.status === "failed" && !row.error_message) {
    merged.error_message = null;
  }
  return shallowEqual(cur, merged) ? cur : merged;
}

/** Insert keeping created_at order; appends in O(1) for the common case. */
export function insertSorted(
  list: ThreadMessage[],
  row: ThreadMessage,
): ThreadMessage[] {
  const t = ts(row.created_at);
  if (list.length === 0 || t >= ts(list[list.length - 1].created_at)) {
    return [...list, row];
  }
  let i = list.length - 1;
  while (i >= 0 && ts(list[i].created_at) > t) i--;
  const next = list.slice();
  next.splice(i + 1, 0, row);
  return next;
}

/**
 * Upsert a server row (realtime INSERT/UPDATE, or a fetched row) into the
 * thread. Dedupes by id, then by Meta message id (wamid), then against a
 * pending optimistic bubble. Returns the same array when nothing changed so
 * React can bail out of the re-render.
 */
export function upsertServerMessage(
  list: ThreadMessage[],
  row: ThreadMessage,
): ThreadMessage[] {
  let idx = list.findIndex((m) => m.id === row.id);
  if (idx < 0 && row.message_id) {
    idx = list.findIndex((m) => m.message_id === row.message_id);
  }
  if (idx < 0) idx = findOptimisticMatch(list, row);

  if (idx >= 0) {
    const cur = list[idx];
    const merged = mergeMessage(cur, row);
    if (merged === cur) return list;
    const next = list.slice();
    next[idx] = merged;
    return next;
  }
  return insertSorted(list, row);
}

/** Upsert many rows (e.g. a gap-fill fetch). */
export function upsertServerMessages(
  list: ThreadMessage[],
  rows: ThreadMessage[],
): ThreadMessage[] {
  let next = list;
  for (const r of rows) next = upsertServerMessage(next, r);
  return next;
}

/**
 * The send API answered for optimistic bubble `key`. Attach the real id and
 * wamid. If the realtime INSERT already produced a *separate* row for the
 * same id (it beat us and the content heuristic didn't match), drop the
 * temp bubble so the message isn't shown twice.
 */
export function confirmOptimistic(
  list: ThreadMessage[],
  key: string,
  result: { id?: string | null; message_id?: string | null },
): ThreadMessage[] {
  const idx = list.findIndex((m) => m.client_key === key);
  if (idx < 0) return list;
  const cur = list[idx];

  if (result.id) {
    const dup = list.findIndex((m, i) => i !== idx && m.id === result.id);
    if (dup >= 0) return list.filter((_, i) => i !== idx);
  }

  const next: ThreadMessage = {
    ...cur,
    id: result.id || cur.id,
    message_id: result.message_id || cur.message_id,
    status: cur.status === "sending" || cur.status === "failed" ? "sent" : cur.status,
    error_message: null,
  };
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}

export function patchByKey(
  list: ThreadMessage[],
  key: string,
  patch: Partial<ThreadMessage>,
): ThreadMessage[] {
  const idx = list.findIndex((m) => messageKey(m) === key);
  if (idx < 0) return list;
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...patch };
  return copy;
}

export function removeByKey(list: ThreadMessage[], key: string): ThreadMessage[] {
  const idx = list.findIndex((m) => messageKey(m) === key);
  if (idx < 0) return list;
  return list.filter((_, i) => i !== idx);
}
