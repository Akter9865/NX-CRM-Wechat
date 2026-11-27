/**
 * Public URLs Meta should call for WhatsApp Cloud API webhooks.
 *
 * The settings screen used to build the callback URL from
 * `window.location.origin`, so whatever host the admin happened to be on
 * (a Vercel preview, `www.` vs apex, localhost) ended up pasted into Meta.
 * We now prefer the configured production origin and only fall back to the
 * browser origin when none is configured.
 */

export const DEFAULT_WEBHOOK_VERIFY_TOKEN = 'wacrm_verify_token'

/** Canonical public origin, without a trailing slash. */
export function getPublicOrigin(fallbackOrigin?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '')
  }
  if (fallbackOrigin) return fallbackOrigin.replace(/\/+$/, '')
  return 'https://nxcrm.online'
}

/** Shared endpoint — routes by `phone_number_id` in the payload. */
export function getSharedWebhookUrl(fallbackOrigin?: string | null): string {
  return `${getPublicOrigin(fallbackOrigin)}/api/whatsapp/webhook`
}

/**
 * Dedicated endpoint for one connection. Verification (GET) is checked
 * against that connection's own verify token, which is what lets each
 * workspace bring its own Meta app without sharing a token.
 */
export function getConnectionWebhookUrl(
  connectionId: string,
  fallbackOrigin?: string | null,
): string {
  return `${getPublicOrigin(fallbackOrigin)}/api/whatsapp/webhook/${encodeURIComponent(connectionId)}`
}
