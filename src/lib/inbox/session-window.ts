import type { Conversation, Message } from "@/types";

/** WhatsApp's customer-service window: free-form replies allowed for 24h. */
export const CUSTOMER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * `conversations.last_customer_message_at` is maintained by the inbound
 * webhook (migrations 049/052) but isn't on the shared `Conversation` type
 * yet; this widens it locally without touching the global types.
 */
export type InboxConversation = Conversation & {
  last_customer_message_at?: string | null;
};

/**
 * Only the WhatsApp Cloud API enforces the 24h window. Telegram and the
 * WhatsApp-Web bridge go through /api/channels/send and have no such rule.
 */
export function channelHasCustomerWindow(channelType: string | undefined | null): boolean {
  return !channelType || channelType === "whatsapp_cloud";
}

function parse(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Date.parse(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Best-known time of the customer's latest message: the conversation's
 * `last_customer_message_at` column, or the newest inbound row in the
 * loaded page of the thread, whichever is newer. Returns null when neither
 * source has one.
 */
export function lastCustomerMessageAt(
  conversation: InboxConversation | null | undefined,
  messages: readonly Pick<Message, "sender_type" | "created_at">[],
): number | null {
  let best = parse(conversation?.last_customer_message_at);
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender_type !== "customer") continue;
    const t = parse(m.created_at);
    if (t !== null && (best === null || t > best)) best = t;
    break;
  }
  return best;
}

export interface CustomerWindowState {
  /** True when free-form messages would be rejected by Meta. */
  expired: boolean;
  /** Epoch ms when the window closes; null if unknown/closed. */
  expiresAt: number | null;
  /** The customer has never written (as far as we can tell). */
  neverMessaged: boolean;
}

/**
 * Derive the window state. `historyComplete` says whether the whole thread
 * is loaded; when it isn't and we have no timestamp at all, we can't prove
 * the window is closed, so we leave sending enabled and let the server
 * guard decide (it surfaces `window_expired`, which the UI handles).
 */
export function customerWindowState(
  lastAt: number | null,
  now: number,
  historyComplete: boolean,
): CustomerWindowState {
  if (lastAt === null) {
    return historyComplete
      ? { expired: true, expiresAt: null, neverMessaged: true }
      : { expired: false, expiresAt: null, neverMessaged: false };
  }
  const expiresAt = lastAt + CUSTOMER_WINDOW_MS;
  return { expired: now >= expiresAt, expiresAt, neverMessaged: false };
}
