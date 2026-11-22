/**
 * Client-side wrapper around the outbound send endpoints. Always resolves
 * (never rejects) with either the server ids or a human-readable error and
 * the machine code the route returns, so callers have one code path.
 */
export interface SendRequest {
  endpoint: string;
  body: Record<string, unknown>;
}

export type SendResult =
  | { ok: true; id: string | null; messageId: string | null }
  | { ok: false; error: string; code: string | null; status: number };

/** Sends that take longer than this are reported as failed (retryable). */
const SEND_TIMEOUT_MS = 45_000;

export function sendEndpointFor(channelType: string | undefined | null): string {
  return channelType === "telegram" || channelType === "whatsapp_web"
    ? "/api/channels/send"
    : "/api/whatsapp/send";
}

export async function postSend({ endpoint, body }: SendRequest): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const error =
        (typeof data.error === "string" && data.error) ||
        (res.status === 429
          ? "You're sending too fast — wait a moment and retry."
          : `Request failed (HTTP ${res.status})`);
      return {
        ok: false,
        error,
        code: typeof data.code === "string" ? data.code : null,
        status: res.status,
      };
    }
    const id =
      (typeof data.message_id === "string" && data.message_id) ||
      (typeof data.messageId === "string" && data.messageId) ||
      null;
    const messageId =
      (typeof data.whatsapp_message_id === "string" && data.whatsapp_message_id) ||
      (typeof data.externalMessageId === "string" && data.externalMessageId) ||
      null;
    return { ok: true, id, messageId };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "The server took too long to respond. Check the thread before retrying."
        : "Network error — check your connection and retry.",
      code: aborted ? "timeout" : "network",
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the error means the WhatsApp 24h window is closed. */
export function isWindowExpiredError(code: string | null, error: string): boolean {
  return code === "window_expired" || /24[- ]hour/i.test(error) || /131047/.test(error);
}
