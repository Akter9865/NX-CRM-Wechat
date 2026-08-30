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
    const s = process.env.META_APP_SECRET.trim()
    if (s) secrets.push(s)
  }
  for (const s of additionalSecrets) {
    if (s) {
      const trimmed = s.trim()
      if (trimmed && !secrets.includes(trimmed)) {
        secrets.push(trimmed)
      }
    }
  }

  if (secrets.length === 0) {
    console.error(
      '[webhook] META_APP_SECRET is not configured in environment and no per-connection App Secret found in database. ' +
        'Inbound webhook rejected. Ensure your Meta App Secret is entered in Settings → WhatsApp or configured in server environment.',
    )
    return false
  }

  if (!signatureHeader) {
    console.warn('[webhook] Inbound request missing X-Hub-Signature-256 header')
    return false
  }

  const sig = signatureHeader.trim()
  if (!sig.startsWith('sha256=')) {
    console.warn('[webhook] Inbound signature header does not start with "sha256="')
    return false
  }

  for (const secret of secrets) {
    try {
      const expected =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true
      }
    } catch (err) {
      console.warn('[webhook] Error during HMAC signature computation:', err)
    }
  }

  console.warn(
    `[webhook] Signature mismatch across ${secrets.length} candidate Meta App Secret(s). Verify your Meta App Secret in Settings → WhatsApp.`,
  )
  return false
}

