import { NextResponse } from 'next/server'
import { GET as sharedGet, POST as sharedPost } from '../route'

/**
 * Per-connection WhatsApp webhook: /api/whatsapp/webhook/<connectionId>
 *
 * Same pipeline as the shared endpoint — inbound payloads are still routed
 * by `phone_number_id` and HMAC-verified — but Meta's verification handshake
 * is checked against this connection's own verify token first. This gives
 * every connected number a stable, unique callback URL to paste into Meta.
 */

// Route segment config is not inherited from the re-exported handlers.
export const maxDuration = 60

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  props: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await props.params
  if (!UUID_RE.test(connectionId)) {
    return NextResponse.json({ error: 'Unknown connection' }, { status: 404 })
  }
  const url = new URL(request.url)
  url.searchParams.set('connection_id', connectionId)
  return sharedGet(new Request(url, { headers: request.headers }))
}

export async function POST(
  request: Request,
  props: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await props.params
  if (!UUID_RE.test(connectionId)) {
    return NextResponse.json({ error: 'Unknown connection' }, { status: 404 })
  }
  return sharedPost(request)
}
