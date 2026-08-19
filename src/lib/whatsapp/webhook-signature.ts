import crypto from 'node:crypto'

/**
 * Verify the HMAC-SHA256 signature Meta attaches to webhook POSTs.
 *
 * Meta signs the raw request body with your App Secret and sends the
 * result in the `x-hub-signature-256: sha256=<hex>` header. Without
 * verification, anyone who knows our webhook URL can POST fabricated
 * status updates and drift broadcast counts arbitrarily.
 *
 * Reference:
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verify-payloads
 *
 * Contract:
 *   `META_APP_SECRET` is **required**. If it's missing we fail closed —
 *   every request is rejected until the operator configures the
 *   secret. A previous version fell open with a warning log, which is
 *   unsafe for a public template: anyone who forgets the env var would
 *   be running a fully spoofable webhook.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  additionalSecrets: string[] = [],
): boolean {
  const secrets: string[] = []
  if (process.env.META_APP_SECRET) {
    secrets.push(process.env.META_APP_SECRET)
  }
  for (const s of additionalSecrets) {
    if (s && !secrets.includes(s)) {
      secrets.push(s)
    }
  }

  if (secrets.length === 0) {
    console.error(
      '[webhook] META_APP_SECRET is not set and no connection app secret found — rejecting request. ' +
        'Configure the env var (Meta → App Settings → Basic → App Secret) or per-connection App Secret ' +
        'to enable signature verification.',
    )
    return false
  }

  if (!signatureHeader) return false
  if (!signatureHeader.startsWith('sha256=')) return false

  for (const secret of secrets) {
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    const a = Buffer.from(signatureHeader)
    const b = Buffer.from(expected)
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true
    }
  }

  return false
}
