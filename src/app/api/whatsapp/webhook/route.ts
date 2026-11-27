import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { getMediaUrl } from '@/lib/whatsapp/meta-api'
import { mirrorInboundMedia } from '@/lib/whatsapp/mirror-inbound-media'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe'
import { reopenClosedConversation } from '@/lib/conversations/reopen'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { dispatchInboundToFlows } from '@/lib/flows/engine'
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply'
import { dispatchWebhookEvent } from '@/lib/webhooks/deliver'
import {
  handleTemplateWebhookChange,
  isTemplateWebhookField,
} from '@/lib/whatsapp/template-webhook'
import {
  handleAccountWebhookChange,
  isAccountWebhookField,
} from '@/lib/whatsapp/account-webhook'

// The `after()` callback in POST runs within this route's max duration.
// Inbound processing can fan out to per-media Meta verification calls, so
// give it headroom beyond the platform default (Vercel clamps this to the
// plan's ceiling). Tune as needed.
export const maxDuration = 60

// Lazy-initialized to avoid build-time crash when env vars are missing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'placeholder-service-key'
    )
  }
  return _adminClient
}

// Fast in-memory deduplication cache for Meta message IDs (wamid). The DB
// unique index on (conversation_id, message_id) is the real idempotency
// boundary; this only spares a warm instance the round trips for a replay
// that lands while (or shortly after) the original is processed.
const recentlyProcessedMessages = new Map<string, number>()
const DEDUPE_TTL_MS = 15 * 60 * 1000
/** Hard cap so a long-lived instance can't grow the map without bound. */
const DEDUPE_MAX_ENTRIES = 10_000

/**
 * Claim a wamid for processing. Returns false when the same id was claimed
 * within the TTL (a duplicate delivery). Entries are pruned lazily — the
 * map used to grow forever on a warm instance.
 */
function claimMessageId(id: string): boolean {
  const now = Date.now()
  const last = recentlyProcessedMessages.get(id)
  if (last !== undefined && now - last < DEDUPE_TTL_MS) return false
  recentlyProcessedMessages.set(id, now)
  if (recentlyProcessedMessages.size > DEDUPE_MAX_ENTRIES) {
    for (const [key, ts] of recentlyProcessedMessages) {
      if (now - ts >= DEDUPE_TTL_MS) recentlyProcessedMessages.delete(key)
    }
    // Still over the cap → drop the oldest (Map iterates in insertion order).
    for (const key of recentlyProcessedMessages.keys()) {
      if (recentlyProcessedMessages.size <= DEDUPE_MAX_ENTRIES) break
      recentlyProcessedMessages.delete(key)
    }
  }
  return true
}

/**
 * Upper bound on independent units (one sender's messages, one status
 * event) processed concurrently from a single delivery. Meta batches up to
 * ~100 changes per POST; unbounded fan-out would stampede the DB and the
 * AI provider, fully sequential processing is what made bursts slow.
 */
const WEBHOOK_CONCURRENCY = 8

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhatsAppConfigRow = any

// Fast in-memory TTL cache for verified tokens and app secrets (5-min TTL)
const verifiedTokensCache = new Map<string, { value: string; configId: string; expiresAt: number }>()
const cachedAppSecrets = new Map<string, { secret: string; expiresAt: number }>()

export function _resetRecentlyProcessedMessagesForTest() {
  recentlyProcessedMessages.clear()
  verifiedTokensCache.clear()
  cachedAppSecrets.clear()
}

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  /**
   * Set when the customer taps a button or list row on an interactive
   * message we sent. `button_reply.id` / `list_reply.id` is whatever id
   * we put on the button/row when sending — the Flows engine uses this
   * to advance the per-contact run.
   */
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
  /**
   * Set when the customer taps a QUICK_REPLY button on a *template*
   * message — a broadcast, or any template send. Meta uses a different
   * envelope from `interactive` above: `type: 'button'`, the label in
   * `button.text`, and the payload configured on the template's button
   * in `button.payload` (Meta's own template editor doesn't ask for a
   * payload and mirrors the label into it).
   */
  button?: { text?: string; payload?: string }
  /** Present when the customer swipe-replies to one of our messages. */
  context?: { id: string }
}

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: WhatsAppMessage[]
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')?.trim()
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')?.trim()
    const phoneParam = searchParams.get('phone_number_id')?.trim()
    const accountParam = searchParams.get('account_id')?.trim()
    const connectionParam = searchParams.get('connection_id')?.trim()

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const DEFAULT_VERIFY_TOKEN = 'wacrm_verify_token'
    const envVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN?.trim()

    // 1. Fast match: accept default verify token or configured environment verify token
    if (
      verifyToken === DEFAULT_VERIFY_TOKEN ||
      (envVerifyToken && verifyToken === envVerifyToken)
    ) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // 2. Check in-memory fast cache (avoid DB query for repeated heartbeat/subscribe pings)
    const now = Date.now()
    const cachedToken = verifiedTokensCache.get(verifyToken)
    if (cachedToken && cachedToken.expiresAt > now) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // 3. Targeted query if phone_number_id or account_id or connection_id is in query params
    let configQuery = supabaseAdmin()
      .from('whatsapp_config')
      .select('id, verify_token')

    if (connectionParam) {
      configQuery = configQuery.eq('id', connectionParam)
    } else if (phoneParam) {
      configQuery = configQuery.eq('phone_number_id', phoneParam)
    } else if (accountParam) {
      configQuery = configQuery.eq('account_id', accountParam)
    } else {
      configQuery = configQuery.eq('is_archived', false)
    }

    let { data: configs, error: configError } = await configQuery

    if (configError || !configs || configs.length === 0) {
      // Fallback: search all configs across all connections
      const fallbackRes = await supabaseAdmin()
        .from('whatsapp_config')
        .select('id, verify_token')

      configs = fallbackRes.data
      configError = fallbackRes.error
    }

    if (configError || !configs) {
      console.error('Error fetching configs for verification:', configError)
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 403 }
      )
    }

    // Check if any config's verify_token matches (direct or decrypted)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchedConfig: any = null
    for (const config of configs) {
      if (!config.verify_token) continue
      if (config.verify_token === verifyToken) {
        matchedConfig = config
        break
      }
      try {
        if (decrypt(config.verify_token) === verifyToken) {
          matchedConfig = config
          break
        }
      } catch {
        // Malformed / wrong-key token row — skip it and keep checking.
      }
    }

    if (matchedConfig) {
      // Cache verified token in memory for 5 minutes
      verifiedTokensCache.set(verifyToken, {
        value: verifyToken,
        configId: matchedConfig.id,
        expiresAt: now + 300000,
      })

      // Fire-and-forget GCM upgrade if needed
      if (isLegacyFormat(matchedConfig.verify_token)) {
        void supabaseAdmin()
          .from('whatsapp_config')
          .update({ verify_token: encrypt(verifyToken) })
          .eq('id', matchedConfig.id)
          .then(({ error }: { error: unknown }) => {
            if (error) {
              console.warn(
                '[webhook] verify_token GCM upgrade failed:',
                (error as { message?: string })?.message ?? error,
              )
            }
          })
      }
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json(
      { error: 'Verification token mismatch' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Receive messages
export async function POST(request: Request) {
  // Read raw body first so we can HMAC-verify the exact bytes Meta
  // signed. request.json() would re-encode and break the signature.
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  // 1. Fast Path: Verify against global environment META_APP_SECRET (0 DB calls)
  let signatureVerified = false
  if (process.env.META_APP_SECRET) {
    signatureVerified = verifyMetaWebhookSignature(rawBody, signature, [])
  }

  // Active whatsapp_config rows already loaded for signature verification,
  // keyed by phone_number_id, reused by processWebhook (saves a query).
  const prefetchedConfigs = new Map<string, WhatsAppConfigRow[]>()

  // 2. Multi-tenant: If not verified by env secret, check per-tenant app secrets with caching
  if (!signatureVerified) {
    const candidateSecrets: string[] = []
    const now = Date.now()

    // Collect cached unexpired secrets first
    for (const [key, item] of cachedAppSecrets.entries()) {
      if (item.expiresAt > now) {
        if (!candidateSecrets.includes(item.secret)) candidateSecrets.push(item.secret)
      } else {
        cachedAppSecrets.delete(key)
      }
    }

    if (candidateSecrets.length > 0 && verifyMetaWebhookSignature(rawBody, signature, candidateSecrets)) {
      signatureVerified = true
    } else {
      // Peek into JSON to extract phone_number_id for targeted secret lookup
      try {
        let peekPhone: string | undefined
        try {
          const parsed = JSON.parse(rawBody)
          const firstEntry = parsed?.entry?.[0]
          const firstChange = firstEntry?.changes?.[0]
          peekPhone = firstChange?.value?.metadata?.phone_number_id
        } catch {}

        // When the phone number is known, fetch the FULL active rows: the
        // exact same rows processWebhook needs for routing, so they are
        // handed over below instead of being queried a second time. The
        // unscoped fallback stays narrow (it spans every tenant).
        let secretQuery = supabaseAdmin()
          .from('whatsapp_config')
          .select(peekPhone ? '*' : 'id, phone_number_id, app_secret')
          .eq('is_archived', false)

        if (peekPhone) {
          secretQuery = secretQuery.eq('phone_number_id', peekPhone)
        }

        const { data: configs, error: secretError } = await secretQuery
        if (peekPhone && !secretError && configs) {
          prefetchedConfigs.set(peekPhone, configs)
        }

        if (configs && configs.length > 0) {
          for (const c of configs) {
            if (c.app_secret) {
              try {
                const dec = decrypt(c.app_secret)
                if (dec && !candidateSecrets.includes(dec)) {
                  candidateSecrets.push(dec)
                  cachedAppSecrets.set(c.phone_number_id || c.id, { secret: dec, expiresAt: now + 300000 })
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('[webhook] error resolving multi-tenant app secrets:', err)
      }

      if (!verifyMetaWebhookSignature(rawBody, signature, candidateSecrets)) {
        console.warn('[webhook] rejected request with invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  }


  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Process AFTER the response so we ack Meta within their ~20s timeout
  // (a slow ack triggers Meta retries + duplicate inserts), while still
  // guaranteeing the work runs to completion.
  //
  // This MUST use `after()` rather than a detached `processWebhook(body)`
  // promise: on serverless platforms (we run on Vercel) the function can
  // be frozen or terminated the moment the response is sent, so a floating
  // promise's DB writes are not guaranteed to finish. That dropped a
  // non-deterministic *subset* of inbound messages — contacts/conversations
  // were created but the message insert never landed, leaving conversations
  // that show in the inbox with an empty thread, and no logs to explain it
  // (see issue #301). `after()` hands the callback to the runtime, which
  // keeps the function alive until it resolves (within the route's
  // maxDuration).
  after(async () => {
    try {
      await processWebhook(body, prefetchedConfigs)
    } catch (error) {
      console.error('Error processing webhook:', error)
    }
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

/**
 * Everything processMessage needs about the receiving connection, resolved
 * once per phone_number_id per delivery.
 */
interface InboundConnection {
  /** Tenancy — drives every contact / conversation lookup and the
   *  engines' active-row dispatch. */
  accountId: string
  /** Audit / sender-of-record — used as the user_id on row inserts that
   *  need it for NOT NULL FK compliance. Always the admin who saved the
   *  WhatsApp config. */
  configOwnerUserId: string
  accessToken: string
  /** Per-account opt-out for the inbound-media mirror (migration 039). */
  mirrorMedia: boolean
  connectionId: string
  /** Connection-level emergency stop, or a banned / restricted number. */
  automationsPaused: boolean
}

/** One unit of webhook work; jobs sharing a key run strictly in order. */
interface KeyedJob {
  key: string
  run: () => Promise<unknown>
}

/**
 * Run jobs with bounded concurrency while preserving per-key ordering:
 * jobs with the same key (one sender's messages, one wamid's status
 * events) run sequentially in payload order; different keys run in
 * parallel. A failing job is logged and never blocks the rest.
 */
async function runKeyedJobs(jobs: KeyedJob[], concurrency: number) {
  const groups = new Map<string, KeyedJob[]>()
  for (const job of jobs) {
    const group = groups.get(job.key)
    if (group) group.push(job)
    else groups.set(job.key, [job])
  }
  const queue = [...groups.values()]
  let next = 0
  const worker = async () => {
    while (next < queue.length) {
      const group = queue[next++]
      for (const job of group) {
        try {
          await job.run()
        } catch (err) {
          console.error('[webhook] job failed:', job.key, err)
        }
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, worker)
  )
}

/**
 * Resolve the active connection for a phone_number_id: config row (reusing
 * the rows POST already loaded for signature verification when available),
 * decrypted token, and the routing flags. The heartbeat write is pushed onto
 * `background` instead of being awaited — nothing downstream reads it.
 */
async function resolveInboundConnection(
  phoneNumberId: string,
  prefetchedRows: WhatsAppConfigRow[] | undefined,
  background: Promise<unknown>[]
): Promise<InboundConnection | null> {
  let configRows = prefetchedRows
  if (!configRows) {
    // Find the active config by phone_number_id. Filter by is_archived=false
    // so previously archived/disconnected connections don't create false
    // duplicates.
    const { data, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .eq('is_archived', false)

    if (configError) {
      console.error(
        'Error fetching whatsapp_config for phone_number_id:',
        phoneNumberId,
        configError
      )
      return null
    }
    configRows = data as WhatsAppConfigRow[] | undefined
  }

  if (!configRows || configRows.length === 0) {
    console.error('No active config found for phone_number_id:', phoneNumberId)
    return null
  }

  // If multiple active rows exist, pick the default or most relevant active config
  const config =
    configRows.find((r: { is_default: boolean; status: string }) => r.is_default && r.status === 'connected') ||
    configRows.find((r: { status: string }) => r.status === 'connected') ||
    configRows[0]

  // Record live heartbeat on incoming webhook without mutating connection
  // status. Off the critical path: awaited (for after()) but in parallel.
  const nowIso = new Date().toISOString()
  background.push(
    Promise.resolve(
      supabaseAdmin()
        .from('whatsapp_config')
        .update({ last_webhook_at: nowIso, last_message_received_at: nowIso })
        .eq('id', config.id)
    ).then(
      (res: { error?: unknown } | undefined) => {
        if (res?.error) console.warn('[webhook] heartbeat update failed:', res.error)
      },
      (err: unknown) => console.warn('[webhook] heartbeat update failed:', err)
    )
  )

  let accessToken: string
  try {
    accessToken = decrypt(config.access_token)
  } catch (decErr) {
    console.error('[webhook] Failed to decrypt access_token for config:', config.id, decErr)
    return null
  }

  // Halt bot/flow automations if connection is banned or restricted
  const isConnectionBlocked = config.status === 'banned' || config.status === 'restricted'

  return {
    accountId: config.account_id,
    configOwnerUserId: config.user_id,
    accessToken,
    // Default ON: the column is NOT NULL DEFAULT TRUE, but a row read
    // before migration 039 lands would have it undefined, and losing
    // attachments is the failure mode worth avoiding.
    mirrorMedia: config.mirror_inbound_media !== false,
    connectionId: config.id,
    automationsPaused: Boolean(config.is_automations_paused) || isConnectionBlocked,
  }
}

async function processWebhook(
  body: { entry?: WhatsAppWebhookEntry[] },
  prefetchedConfigs?: Map<string, WhatsAppConfigRow[]>
) {
  if (!body.entry) return

  // Was fully sequential: a batch of N messages from N customers took N×
  // the single-message latency, so the last customer in a burst waited for
  // every other one. Now independent units run concurrently (bounded),
  // while each sender's messages — and each wamid's status events — keep
  // their payload order.
  const jobs: KeyedJob[] = []
  const background: Promise<unknown>[] = []
  const connections = new Map<string, Promise<InboundConnection | null>>()
  const messageChanges: Promise<void>[] = []

  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      // Template-lifecycle events (status / quality / components
      // updates from Meta) come in on a different change.field and
      // have a different value shape — route them through the
      // dedicated handler. Skip the messaging branches below so we
      // don't try to read message-shaped fields off a template event.
      // Lifecycle events share one key so they still apply in order.
      if (isTemplateWebhookField(change.field)) {
        jobs.push({
          key: 'lifecycle',
          run: () =>
            handleTemplateWebhookChange(
              { field: change.field, value: change.value as unknown },
              supabaseAdmin(),
            ),
        })
        continue
      }

      // Account-lifecycle events (phone_number_quality_update / account_update /
      // account_review_update / security) from Meta alert us to quality degradation,
      // policy violations, account bans, or restrictions.
      if (isAccountWebhookField(change.field)) {
        jobs.push({
          key: 'lifecycle',
          run: () =>
            handleAccountWebhookChange(
              { field: change.field, value: change.value as unknown },
              supabaseAdmin(),
            ),
        })
        continue
      }

      const value = change.value
      if (!value) continue

      // Handle status updates
      for (const status of value.statuses ?? []) {
        jobs.push({ key: `status:${status.id}`, run: () => handleStatusUpdate(status) })
      }

      // Handle incoming messages
      const messages = value.messages
      if (!messages || messages.length === 0) continue

      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) {
        console.warn('[webhook] Inbound message missing phone_number_id in metadata')
        continue
      }

      // One config lookup (+ heartbeat) per phone number per delivery,
      // shared by every change for that number.
      let connection = connections.get(phoneNumberId)
      if (!connection) {
        connection = resolveInboundConnection(
          phoneNumberId,
          prefetchedConfigs?.get(phoneNumberId),
          background
        ).catch((err) => {
          console.error('[webhook] resolving connection failed:', phoneNumberId, err)
          return null
        })
        connections.set(phoneNumberId, connection)
      }

      messageChanges.push(
        connection.then((conn) => {
          if (!conn) return
          messages.forEach((message, i) => {
            const rawContact = value.contacts?.[i] || value.contacts?.[0]
            const contact = rawContact || {
              profile: { name: message.from },
              wa_id: message.from,
            }
            jobs.push({
              // Conversations are one-per-(account, contact), so this key
              // serialises everything that touches the same thread.
              key: `msg:${conn.accountId}:${normalizePhone(message.from)}`,
              run: () => processMessage(message, contact, conn),
            })
          })
        })
      )
    }
  }

  try {
    await Promise.all(messageChanges)
    await runKeyedJobs(jobs, WEBHOOK_CONCURRENCY)
  } finally {
    await Promise.allSettled(background)
  }
}

// The happy-path status ladder — pending → sent → delivered → read →
// replied. Webhook replays must never regress a recipient back down
// this ladder.
//
// `failed` is NOT on this ladder. It's a terminal side branch that is
// only valid from the early states (pending / sent) — once Meta has
// delivered or the user has read or replied, a later "failed" status
// event is a bug in Meta's pipeline or a spoof attempt and must be
// ignored.
const RECIPIENT_STATUS_LADDER = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
] as const

function ladderLevel(s: string): number {
  const idx = (RECIPIENT_STATUS_LADDER as readonly string[]).indexOf(s)
  return idx < 0 ? -1 : idx
}

/**
 * Can a recipient transition from `current` to `incoming`?
 *   - Along the ladder, only forward moves are allowed.
 *   - `failed` is accepted only from `pending` or `sent`; it's refused
 *     once the recipient has reached any of the success states.
 */
function isValidStatusTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') {
    return current === 'pending' || current === 'sent'
  }
  if (current === 'failed') {
    return false // failed is terminal
  }
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false // unknown incoming status
  if (ci < 0) return true // unknown current — accept anything on the ladder
  return ii > ci
}

/** Every value broadcast_recipients.status can hold (CHECK constraint). */
const RECIPIENT_STATUSES = [...RECIPIENT_STATUS_LADDER, 'failed'] as const

/**
 * Statuses a broadcast recipient may currently hold for `incoming` to be
 * applied — `isValidStatusTransition` turned into a SQL filter, so the
 * guard and the write are one atomic UPDATE instead of a read followed by
 * a write (which raced when two status events for one wamid landed
 * concurrently, and cost an extra round trip on every status event).
 */
function allowedPriorRecipientStatuses(incoming: string): string[] {
  return RECIPIENT_STATUSES.filter((current) =>
    isValidStatusTransition(current, incoming)
  )
}

/**
 * Ladder statuses on `messages` that an incoming status must NOT overwrite.
 * Meta does not guarantee status-event order (and redelivers), so a late
 * `delivered` used to regress a `read` message back to two grey ticks.
 * `failed` and unknown statuses keep their previous unconditional write.
 */
const MESSAGE_STATUS_LADDER = ['sending', 'sent', 'delivered', 'read'] as const
function messageStatusesAbove(incoming: string): string[] {
  const idx = (MESSAGE_STATUS_LADDER as readonly string[]).indexOf(incoming)
  return idx < 0 ? [] : MESSAGE_STATUS_LADDER.slice(idx + 1)
}

async function handleStatusUpdate(status: {
  id: string
  status: string
  timestamp: string
  recipient_id: string
  errors?: Array<{
    code: number
    title: string
    message?: string
    error_data?: { details?: string }
  }>
}) {
  // Extract error explanation if Meta reported a failure
  let errorMessage: string | null = null
  if (status.status === 'failed' && status.errors && status.errors.length > 0) {
    const err = status.errors[0]
    errorMessage = `[${err.code}] ${err.title || 'Error'}: ${err.message || err.error_data?.details || 'Undeliverable'}`
  }

  // 1) Mirror onto messages — update status and error_message. The
  //    updated row is returned WITH its owning account (embedded join), so
  //    the webhook fan-out below no longer needs a separate lookup query.
  const messageUpdate: Record<string, unknown> = { status: status.status }
  if (errorMessage) {
    messageUpdate.error_message = errorMessage
  }

  let messageQuery = supabaseAdmin()
    .from('messages')
    .update(messageUpdate)
    .eq('message_id', status.id)
  const above = messageStatusesAbove(status.status)
  if (above.length > 0) {
    messageQuery = messageQuery.not('status', 'in', `(${above.join(',')})`)
  }
  const messageTask = messageQuery.select('conversation_id, conversations(account_id)')

  // 2) Mirror onto broadcast_recipients via whatsapp_message_id
  //    (added in migration 003). The aggregate trigger on
  //    broadcast_recipients re-derives the parent broadcast's
  //    sent/delivered/read/failed counts automatically. Independent of
  //    (1), so both writes run concurrently.
  const recipientTask = (async () => {
    // Guard transitions — forward-only on the success ladder, and
    // `failed` only from pre-delivered states — enforced in SQL.
    const allowedPrior = allowedPriorRecipientStatuses(status.status)
    if (allowedPrior.length === 0) return

    const tsIso = new Date(parseInt(status.timestamp) * 1000).toISOString()
    const update: Record<string, unknown> = { status: status.status }
    if (errorMessage) update.error_message = errorMessage
    if (status.status === 'sent') update.sent_at = tsIso
    if (status.status === 'delivered') update.delivered_at = tsIso
    if (status.status === 'read') update.read_at = tsIso

    const { error: recUpdateErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update(update)
      .eq('whatsapp_message_id', status.id)
      .in('status', allowedPrior)

    if (recUpdateErr) {
      console.error('Error updating broadcast recipient status:', recUpdateErr)
    }
  })()

  const [messageResult] = await Promise.all([messageTask, recipientTask])
  const { data: msgRows, error: msgErr } = messageResult as {
    data: Array<{ conversation_id: string; conversations: unknown }> | null
    error: unknown
  }
  if (msgErr) {
    console.error('Error updating message status:', msgErr)
  }

  // 3) Webhook fan-out for messages we store (inbox / API sends). Runs
  //    after both mirrors so a slow subscriber can't delay them. A status
  //    the ladder guard refused (out-of-order replay) is not dispatched.
  const msgRow = msgRows?.[0]
  if (msgRow) {
    const conv = (Array.isArray(msgRow.conversations)
      ? msgRow.conversations[0]
      : msgRow.conversations) as { account_id: string } | null
    const accountId = conv?.account_id
    if (accountId) {
      await dispatchWebhookEvent(
        supabaseAdmin(),
        accountId,
        'message.status_updated',
        {
          whatsapp_message_id: status.id,
          conversation_id: msgRow.conversation_id,
          status: status.status,
          error: errorMessage || undefined,
        }
      )
    }
  }
}

/**
 * If an inbound message's sender is on a still-unreplied
 * broadcast_recipients row, flip it to `replied` so the reply count
 * advances on the parent broadcast.
 *
 * Runs on a best-effort basis — failures here must not break the
 * main inbound-message flow, so errors are swallowed with a log.
 */
async function flagBroadcastReplyIfAny(accountId: string, contactId: string) {
  try {
    // Most recent outbound broadcast in this account that hasn't
    // been replied to yet. Account-scoped so a shared inbox reply
    // marks the broadcast as replied regardless of which teammate
    // sent it.
    const { data: recs, error } = await supabaseAdmin()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(account_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.account_id', accountId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !recs || recs.length === 0) return

    const row = recs[0]
    const { error: updErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('id', row.id)

    if (updErr) {
      console.error('Error marking broadcast recipient replied:', updErr)
    }
  } catch (err) {
    console.error('flagBroadcastReplyIfAny failed:', err)
  }
}

/**
 * Resolve a Meta-side message_id into the matching internal UUID, scoped
 * to one conversation. Returns null when we never received the parent
 * (e.g. a swipe-reply to a message older than this CRM install).
 */
async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', metaId)
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (error) {
    console.error('[webhook] lookupInternalIdByMetaId failed:', error.message)
    return null
  }
  return data?.id ?? null
}

/**
 * Persist an inbound reaction. WhatsApp reactions are not new messages —
 * they're per-(target, actor) state. We upsert / delete on
 * `message_reactions`, never write a row into `messages`.
 *
 * Best-effort: a missing parent (we never received it) is logged and
 * skipped so the webhook still acks 200 to Meta.
 */
async function handleReaction(
  message: WhatsAppMessage,
  conversationId: string,
  contactId: string
) {
  const reaction = message.reaction
  if (!reaction?.message_id) return

  const targetInternalId = await lookupInternalIdByMetaId(
    reaction.message_id,
    conversationId
  )
  if (!targetInternalId) {
    console.warn(
      '[webhook] reaction target message not found; skipping',
      reaction.message_id
    )
    return
  }

  // Empty emoji = removal (per Meta's Cloud API spec).
  if (!reaction.emoji) {
    const { error: delError } = await supabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', targetInternalId)
      .eq('actor_type', 'customer')
      .eq('actor_id', contactId)
    if (delError) {
      console.error('[webhook] reaction delete failed:', delError.message)
    }
    return
  }

  const { error: upsertError } = await supabaseAdmin()
    .from('message_reactions')
    .upsert(
      {
        message_id: targetInternalId,
        conversation_id: conversationId,
        actor_type: 'customer',
        actor_id: contactId,
        emoji: reaction.emoji,
      },
      { onConflict: 'message_id,actor_type,actor_id' }
    )
  if (upsertError) {
    console.error('[webhook] reaction upsert failed:', upsertError.message)
  }
}

/**
 * Run a best-effort side effect, logging instead of rejecting so it can sit
 * in a `Promise.all` / background list without taking anything down.
 */
function settle(label: string, task: () => PromiseLike<unknown>): Promise<void> {
  return Promise.resolve()
    .then(task)
    .then(
      () => undefined,
      (err) => {
        console.error(label, err)
      }
    )
}

/**
 * The messages.content_type CHECK constraint (widened in migration 010
 * to add 'interactive' for button/list taps) allows:
 *   text, image, document, audio, video, location, template, interactive
 * Map incoming WhatsApp types that aren't in that list to the closest
 * allowed value so the INSERT doesn't fail with a constraint error.
 */
const ALLOWED_CONTENT_TYPES = new Set([
  'text', 'image', 'document', 'audio', 'video',
  'location', 'template', 'interactive',
])
function contentTypeFor(messageType: string): string {
  return ALLOWED_CONTENT_TYPES.has(messageType)
    ? messageType
    : messageType === 'sticker'
      ? 'image'         // stickers are images
      : messageType === 'button'
        ? 'interactive' // template quick-reply tap (issue #478)
        : 'text'        // reaction, unknown → text fallback
}

const OPT_OUT_KEYWORDS = new Set([
  'stop', 'unsubscribe', 'cancel', 'optout', 'opt-out',
  'ar message dio na', 'bondho koro', 'thamo', 'stop message',
])
const OPT_IN_KEYWORDS = new Set([
  'start', 'unstop', 'subscribe', 'restart', 'shuru koro',
])

/**
 * Postgres error classes that will fail identically on a retry: data
 * exceptions (22), integrity violations (23), syntax / undefined objects
 * (42). Anything else on the idempotent message upsert — a dropped
 * connection, a statement timeout, a deadlock, a gateway 5xx — is worth
 * one more attempt, because giving up there loses the customer's message
 * (Meta already has its 200 and will not redeliver).
 */
function isPermanentDbError(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ''
  return /^(22|23|42)/.test(code)
}

/**
 * Whether the conversation has no earlier customer message. An existence
 * probe (LIMIT 1) rather than COUNT(*): the count had to visit every
 * customer message in the thread on every inbound, so it got slower the
 * longer a conversation ran.
 */
async function hasNoPriorCustomerMessages(conversationId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'customer')
    .limit(1)
  // Matches the previous COUNT semantics, where an error read as 0.
  if (error) return true
  return !data || data.length === 0
}

/**
 * Mirror inbound media into the `chat-media` bucket and point the stored
 * message at the durable copy. Runs AFTER the message row is inserted —
 * the row goes in immediately with the `/api/whatsapp/media/<id>` proxy
 * URL (which the inbox renders straight away), and realtime delivers this
 * UPDATE to open threads when the mirror lands. Previously the whole
 * Meta-lookup + download + upload sat in front of the insert, so a photo
 * took seconds to appear in the inbox, and a slow Meta CDN could hold it
 * back for the full route duration.
 *
 * Strictly best-effort: any failure leaves the proxy URL in place, which
 * works for as long as Meta retains the bytes (~30 days, issue #466).
 */
async function mirrorAndPatchMedia(args: {
  messageRowId: string
  mediaId: string
  fileName: string | null
  accountId: string
  accessToken: string
  messageTimestamp: string
}) {
  const { messageRowId, mediaId, fileName, accountId, accessToken, messageTimestamp } = args
  try {
    const info = await getMediaUrl({ mediaId, accessToken })
    const mirrored = await mirrorInboundMedia({
      storage: supabaseAdmin().storage,
      accountId,
      mediaId,
      downloadUrl: info.url,
      accessToken,
      mimeType: info.mimeType,
      fileSize: info.fileSize,
      fileName,
      messageTimestamp,
    })
    if (!mirrored) return

    const { error } = await supabaseAdmin()
      .from('messages')
      .update({ media_url: mirrored })
      .eq('id', messageRowId)
    if (error) {
      console.error(`[webhook] failed to store mirrored URL for media ${mediaId}:`, error)
    }
  } catch (error) {
    console.error(
      `Failed to verify media ${mediaId} with Meta:`,
      error instanceof Error ? error.message : error
    )
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  conn: InboundConnection
) {
  // Layer 1 Fast In-Memory Deduplication: Drop duplicate webhook calls arriving in milliseconds
  if (message.id && !claimMessageId(message.id)) {
    console.info('[webhook] In-memory fast deduplication hit for message:', message.id)
    return
  }

  // Best-effort writes that nothing downstream reads (contact rename,
  // broadcast reply flag, media mirror, conversation.created dispatch).
  // Collected rather than awaited inline, then awaited together at the end
  // so `after()` still keeps the function alive until they finish.
  const background: Promise<unknown>[] = []
  let handled = false
  try {
    handled = await processMessageInner(message, contact, conn, background)
  } finally {
    // A delivery that failed before the message was persisted must stay
    // retryable: if the in-memory claim survived, a Meta redelivery to
    // this warm instance within 15 min would be silently dropped and the
    // message lost for good.
    if (!handled && message.id) recentlyProcessedMessages.delete(message.id)
    await Promise.allSettled(background)
  }
}

/** @returns true once the message is durably handled (stored, recognised
 *  as a replay, or a reaction applied); false on a failure before that. */
async function processMessageInner(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  conn: InboundConnection,
  background: Promise<unknown>[]
): Promise<boolean> {
  const {
    accountId,
    configOwnerUserId,
    accessToken,
    mirrorMedia,
    connectionId,
    automationsPaused: isConnectionAutomationsPaused,
  } = conn

  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  // Find or create contact
  const contactOutcome = await findOrCreateContact(
    accountId,
    configOwnerUserId,
    senderPhone,
    contactName,
    background
  )
  if (!contactOutcome) return false
  const contactRecord = contactOutcome.contact

  // Find or create conversation
  const convResult = await findOrCreateConversation(
    accountId,
    configOwnerUserId,
    contactRecord.id,
    connectionId
  )
  if (!convResult) return false
  const conversation = convResult.conversation

  // Emit conversation.created as soon as the thread is opened — BEFORE
  // the reaction short-circuit below — so a conversation first opened by
  // a reaction still fires the event, and a subscriber always sees the
  // thread open before its first message.received (that dispatch awaits
  // this promise). It no longer blocks the message insert: a slow
  // subscriber endpoint used to delay the first message of every new
  // conversation by up to the delivery timeout.
  const conversationCreatedDispatch: Promise<void> = convResult.created
    ? settle('[webhook] conversation.created dispatch failed:', () =>
        dispatchWebhookEvent(supabaseAdmin(), accountId, 'conversation.created', {
          conversation_id: conversation.id,
          contact_id: contactRecord.id,
        })
      )
    : Promise.resolve()
  background.push(conversationCreatedDispatch)

  // Reactions short-circuit here — they aren't messages. We never insert
  // into `messages`, never bump unread_count, never update last_message_text.
  if (message.type === 'reaction') {
    await handleReaction(message, conversation.id, contactRecord.id)
    return true
  }

  // Parse message content based on type. Pure — no network. Media is
  // stored with its proxy URL now and mirrored after the insert.
  const { contentText, mediaUrl, mediaType, interactiveReplyId, media } =
    parseMessageContent(message)

  const contentType = contentTypeFor(message.type)

  // Resolve swipe-reply context (a missing parent is fine — we store NULL
  // and the UI renders the message without a quote) and determine whether
  // this is the contact's very first inbound message BEFORE we insert, so
  // the check is accurate. The latter covers a contact row that already
  // exists (manual add / CSV import) but has never messaged us — which
  // new_contact_created wouldn't catch. A conversation this delivery just
  // created has no messages, so that case skips the query. Both lookups
  // are independent and run concurrently.
  const [replyToInternalId, isFirstInboundMessage] = await Promise.all([
    message.context?.id
      ? lookupInternalIdByMetaId(message.context.id, conversation.id).then((id) => {
          if (!id) {
            console.warn('[webhook] reply context parent not found:', message.context?.id)
          }
          return id
        })
      : Promise.resolve(null),
    convResult.created
      ? Promise.resolve(true)
      : hasNoPriorCustomerMessages(conversation.id),
  ])

  // Insert message — field names MUST match the messages table schema
  // (see supabase/migrations/001_initial_schema.sql).
  //
  // Idempotent insert. Meta retries webhook deliveries (a slow ack, a
  // transient 5xx), and each retry replays the exact same message.id. The
  // unique index on (conversation_id, message_id) added in migration 037
  // makes a replay conflict; `ignoreDuplicates` turns that into an ON
  // CONFLICT DO NOTHING, and the `.select()` then returns the inserted row
  // ONLY on a genuine first insert — an empty result means this delivery
  // was a replay. This is the single idempotency boundary that must sit
  // BEFORE the unread bump and all downstream fan-out below (issue #367).
  const messageTimeIso = new Date(parseInt(message.timestamp) * 1000).toISOString()
  const messageRow = {
    conversation_id: conversation.id,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    // Meta's MIME type for the attachment (migration 039).
    media_type: mediaType,
    message_id: message.id,
    status: 'delivered',
    created_at: messageTimeIso,
    reply_to_message_id: replyToInternalId,
    // Only populated for content_type='interactive'. Migration 010 added
    // the column; null for every other content_type.
    interactive_reply_id: interactiveReplyId,
  }
  const insertMessage = () =>
    supabaseAdmin()
      .from('messages')
      .upsert(messageRow, {
        onConflict: 'conversation_id,message_id',
        ignoreDuplicates: true,
      })
      .select('id')

  let { data: insertedRows, error: msgError } = await insertMessage()
  if (msgError && !isPermanentDbError(msgError)) {
    // Safe to repeat: the upsert is idempotent on (conversation_id, message_id).
    console.warn('[webhook] message insert failed, retrying once:', msgError)
    await new Promise((r) => setTimeout(r, 250))
    ;({ data: insertedRows, error: msgError } = await insertMessage())
  }

  if (msgError) {
    console.error('Error inserting message:', msgError)
    return false
  }

  // Replayed delivery: the message already exists, so acknowledge it as a
  // no-op. Returning here is what keeps a retry from double-bumping unread,
  // re-advancing flows, re-firing automations, re-invoking AI handling, and
  // re-dispatching public webhooks (issue #367).
  if (!insertedRows || insertedRows.length === 0) {
    console.info(
      '[webhook] duplicate inbound message ignored (idempotent replay):',
      message.id
    )
    return true
  }
  const insertedMessageId = (insertedRows[0] as { id: string }).id

  // Inbound media → durable bucket copy, in the background (see
  // mirrorAndPatchMedia). Account opt-out leaves the proxy URL as-is.
  if (media && mirrorMedia) {
    background.push(
      mirrorAndPatchMedia({
        messageRowId: insertedMessageId,
        mediaId: media.id,
        fileName: media.fileName,
        accountId,
        accessToken,
        messageTimestamp: message.timestamp,
      })
    )
  }

  // Auto-detect Opt-Out and Opt-In keywords (Compliance & Anti-Ban
  // requirement). Decided synchronously; the write runs alongside the
  // conversation update below.
  const inboundTextRaw = (contentText ?? message.text?.body ?? '').trim().toLowerCase()
  let optWrite: Promise<void> = Promise.resolve()
  if (OPT_OUT_KEYWORDS.has(inboundTextRaw) && contactRecord?.id) {
    contactRecord.is_opted_out = true
    optWrite = settle('[webhook] opt-out update failed:', async () => {
      const { error } = await supabaseAdmin()
        .from('contacts')
        .update({ is_opted_out: true, updated_at: new Date().toISOString() })
        .eq('id', contactRecord.id)
      if (error) throw error
      console.info(`[webhook] Opt-out keyword "${inboundTextRaw}" detected from contact ${contactRecord.id}. Set is_opted_out=true.`)
    })
  } else if (OPT_IN_KEYWORDS.has(inboundTextRaw) && contactRecord?.id && contactRecord.is_opted_out) {
    contactRecord.is_opted_out = false
    optWrite = settle('[webhook] opt-in update failed:', async () => {
      const { error } = await supabaseAdmin()
        .from('contacts')
        .update({ is_opted_out: false, updated_at: new Date().toISOString() })
        .eq('id', contactRecord.id)
      if (error) throw error
      console.info(`[webhook] Opt-in keyword "${inboundTextRaw}" detected from contact ${contactRecord.id}. Cleared is_opted_out.`)
    })
  }

  // Update conversation. The unread bump is done DB-side rather than as a
  // read-modify-write of the snapshot loaded above (issue #369). Migration
  // 052's update_conversation_on_inbound also refreshes the last-message
  // summary, last_customer_message_at, the connection binding, and
  // re-opens a closed thread (issue #409) in the same statement.
  const lastMsgSummary = contentText || `[${message.type}]`
  const conversationWrite = settle('Error updating conversation on inbound:', async () => {
    const { error: atomicConvErr } = await supabaseAdmin().rpc(
      'update_conversation_on_inbound',
      {
        p_conversation_id: conversation.id,
        p_connection_id: connectionId || conversation.whatsapp_connection_id || null,
        p_last_message_text: lastMsgSummary,
        p_message_timestamp: messageTimeIso,
      }
    )
    if (!atomicConvErr) return

    // Graceful fallback for environments where RPC update_conversation_on_inbound is not yet present
    const { error: convError } = await supabaseAdmin().rpc(
      'bump_conversation_on_inbound',
      {
        p_conversation_id: conversation.id,
        p_last_message_text: lastMsgSummary,
      }
    )
    if (convError) {
      console.error('Error updating conversation with bump RPC:', convError)
    }

    await Promise.all([
      supabaseAdmin()
        .from('conversations')
        .update({
          last_customer_message_at: messageTimeIso,
          whatsapp_connection_id: connectionId || conversation.whatsapp_connection_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id),
      // The new RPC re-opens closed threads itself; the legacy one doesn't.
      reopenClosedConversation(supabaseAdmin(), conversation),
    ])
  })

  // Awaited before any fan-out: sends from flows / automations / AI check
  // the 24h window (last_customer_message_at) and the engines re-read the
  // contact's opt-out flag from the DB.
  await Promise.all([conversationWrite, optWrite])

  // If this contact was a recent broadcast recipient, flag the reply so the
  // broadcast's `replied_count` advances (migration 003). Nothing below
  // depends on it.
  background.push(flagBroadcastReplyIfAny(accountId, contactRecord.id))

  // Check if Bot / Flow Automations are paused:
  // 1. Thread-level pause (ai_autoreply_disabled)
  // 2. Contact is opted out (is_opted_out)
  // 3. Global / Connection-level Emergency Stop (isConnectionAutomationsPaused)
  const isBotAutomationPaused =
    Boolean(conversation?.ai_autoreply_disabled) ||
    Boolean(contactRecord?.is_opted_out) ||
    Boolean(isConnectionAutomationsPaused)

  const inboundText = contentText ?? message.text?.body ?? ''

  // Bot pipeline: flows → automations → AI reply. Kept strictly in this
  // order (flows win over automations and the LLM; an automation may assign
  // the thread, which the AI reply must see). Each stage is isolated so a
  // throw in one can't skip the next. Awaited — not fire-and-forget —
  // because we're inside the route's `after()` block, which only keeps the
  // function alive for promises it can see (issues #301 / #409).
  const botPipeline = (async () => {
    let flowConsumed = false
    if (!isBotAutomationPaused) {
      try {
        const flowResult = await dispatchInboundToFlows({
          accountId,
          userId: configOwnerUserId,
          contactId: contactRecord.id,
          conversationId: conversation.id,
          message:
            interactiveReplyId
              ? {
                kind: 'interactive_reply',
                reply_id: interactiveReplyId,
                reply_title: contentText ?? '',
                meta_message_id: message.id,
              }
              : {
                kind: 'text',
                text: inboundText,
                meta_message_id: message.id,
              },
          isFirstInboundMessage,
        })
        flowConsumed = flowResult.consumed
      } catch (err) {
        console.error('[flows] dispatch failed:', err)
      }
    }

    const automationTriggers: (
      | 'new_contact_created'
      | 'first_inbound_message'
      | 'new_message_received'
      | 'keyword_match'
      | 'interactive_reply'
    )[] = []
    // Content-level triggers are suppressed when a flow consumed the
    // message OR when bot automations are explicitly paused for this conversation.
    if (!flowConsumed && !isBotAutomationPaused) {
      automationTriggers.push('new_message_received', 'keyword_match')
      // Interactive tap → fire the interactive_reply trigger too.
      if (interactiveReplyId) {
        automationTriggers.push('interactive_reply')
      }
    }
    // new_contact_created fires only when the webhook just auto-created the
    // contact row. first_inbound_message fires whenever this is the contact's
    // first-ever customer-sent message — a superset that also catches
    // manually-imported contacts sending for the first time.
    if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
    if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')
    // Sequential on purpose: automations for different triggers may each
    // text the customer, and their order must stay deterministic.
    // `runAutomationsForTrigger` never throws; the catch is belt-and-braces
    // so one trigger type's failure can't skip the rest of the loop.
    for (const triggerType of automationTriggers) {
      await runAutomationsForTrigger({
        accountId,
        triggerType,
        contactId: contactRecord.id,
        context: {
          message_text: inboundText,
          conversation_id: conversation.id,
          // Only set on interactive taps; drives the interactive_reply
          // trigger's exact-id match.
          interactive_reply_id: interactiveReplyId ?? undefined,
        },
      }).catch((err) => console.error('[automations] dispatch failed:', err))
    }

    // AI auto-reply. Runs only for plain-text inbound the deterministic
    // flow runner did NOT consume (flows win over the LLM), when bot
    // automations are not paused, and only when the account has enabled it.
    if (!flowConsumed && !isBotAutomationPaused && !interactiveReplyId && inboundText.trim()) {
      try {
        await dispatchInboundToAiReply({
          accountId,
          conversationId: conversation.id,
          contactId: contactRecord.id,
          configOwnerUserId,
        })
      } catch (err) {
        console.error('[ai auto-reply] dispatch failed:', err)
      }
    }
  })()

  // message.received webhook (public API). Independent of the bot
  // pipeline, so it no longer waits behind flows + automations + an LLM
  // call. Ordered after conversation.created for the same thread.
  const publicWebhook = settle('[webhook] message.received dispatch failed:', async () => {
    await conversationCreatedDispatch
    await dispatchWebhookEvent(supabaseAdmin(), accountId, 'message.received', {
      conversation_id: conversation.id,
      contact_id: contactRecord.id,
      whatsapp_message_id: message.id,
      content_type: contentType,
      text: contentText,
    })
  })

  await Promise.allSettled([botPipeline, publicWebhook])
  return true
}

function parseMessageContent(message: WhatsAppMessage): {
  contentText: string | null
  mediaUrl: string | null
  mediaType: string | null
  /**
   * For interactive button / list replies: the stable id of the tapped
   * option (whatever we put on the button when sending). Used by the
   * Flows engine to advance the per-contact run; persisted to
   * `messages.interactive_reply_id` so the inbox bubble can render the
   * tap with the right affordance. Null for everything else.
   */
  interactiveReplyId: string | null
  /** Meta media to mirror into `chat-media` once the row exists. */
  media: { id: string; fileName: string | null } | null
} {
  // Media is stored with the `/api/whatsapp/media/<id>` proxy URL — which
  // the inbox renders immediately — and copied into the `chat-media`
  // bucket AFTER the row is inserted (see mirrorAndPatchMedia), because
  // Meta deletes media ~30 days after receipt (issue #466). Doing the
  // Meta lookup + download + upload here, before the insert, is what made
  // inbound attachments take seconds to show up in the inbox.
  const withMedia = (mediaId: string, fileName?: string | null) => ({
    mediaUrl: `/api/whatsapp/media/${mediaId}`,
    media: { id: mediaId, fileName: fileName ?? null },
  })

  // Default shape — each case overrides only the fields it cares about.
  // Keeps the new `interactiveReplyId` field DRY across every return site.
  const empty = {
    contentText: null,
    mediaUrl: null,
    mediaType: null,
    interactiveReplyId: null,
    media: null,
  }

  switch (message.type) {
    case 'text':
      return { ...empty, contentText: message.text?.body || null }

    case 'image':
      if (message.image?.id) {
        return {
          ...empty,
          contentText: message.image.caption || null,
          ...withMedia(message.image.id),
          mediaType: message.image.mime_type,
        }
      }
      return empty

    case 'video':
      if (message.video?.id) {
        return {
          ...empty,
          contentText: message.video.caption || null,
          ...withMedia(message.video.id),
          mediaType: message.video.mime_type,
        }
      }
      return empty

    case 'document':
      if (message.document?.id) {
        return {
          ...empty,
          contentText:
            message.document.caption || message.document.filename || null,
          // The sender's own filename becomes the mirrored object's
          // name, so saving the attachment yields `invoice.pdf` even
          // when a caption displaced the filename in content_text.
          ...withMedia(message.document.id, message.document.filename),
          mediaType: message.document.mime_type,
        }
      }
      return empty

    case 'audio':
      if (message.audio?.id) {
        return {
          ...empty,
          ...withMedia(message.audio.id),
          mediaType: message.audio.mime_type,
        }
      }
      return empty

    case 'sticker':
      // Stickers are images under the hood. Treat them as such so the
      // MessageBubble renders the <img>. The caller maps the DB
      // content_type to 'image' for the CHECK constraint.
      if (message.sticker?.id) {
        return {
          ...empty,
          ...withMedia(message.sticker.id),
          mediaType: message.sticker.mime_type,
        }
      }
      return empty

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return { ...empty, contentText: locationText }
      }
      return empty

    case 'reaction':
      return { ...empty, contentText: message.reaction?.emoji || null }

    case 'interactive': {
      // The customer tapped a reply button or a list row on a message
      // we previously sent. Meta delivers `interactive.button_reply` for
      // 3-button messages and `interactive.list_reply` for list messages.
      // Use the human-readable title as contentText so the inbox bubble
      // renders the tap legibly ("Existing customer"), and stash the
      // stable id separately so the Flows engine can route on it.
      const reply =
        message.interactive?.button_reply ?? message.interactive?.list_reply
      if (reply?.id) {
        return {
          ...empty,
          contentText: reply.title || reply.id,
          interactiveReplyId: reply.id,
        }
      }
      return { ...empty, contentText: '[Interactive reply]' }
    }

    case 'button': {
      // Quick-reply tap on a TEMPLATE message. Meta delivers these under
      // their own `button` envelope rather than `interactive` above, so
      // without this case they fell through to `default` and landed in
      // the inbox as "[Unsupported message type: button]" with a null
      // interactiveReplyId — which also meant the Flows engine and the
      // `interactive_reply` automation trigger never saw the tap, so
      // nothing chained off a broadcast reply (issue #478).
      //
      // `payload` is the stable value (the analogue of
      // `button_reply.id`); `text` is the visible label. Prefer the
      // payload for routing and the label for display, each falling
      // back to the other since a template may carry only one.
      const payload = message.button?.payload || null
      const label = message.button?.text || null
      return {
        ...empty,
        contentText: label || payload,
        interactiveReplyId: payload || label,
      }
    }

    default:
      return {
        ...empty,
        contentText: `[Unsupported message type: ${message.type}]`,
      }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContactRow = any

interface ContactOutcome {
  contact: ContactRow
  /** True when this call created the row; drives new_contact_created
   *  automation dispatch in processMessage. */
  wasCreated: boolean
}

async function findOrCreateContact(
  accountId: string,
  configOwnerUserId: string,
  phone: string,
  name: string,
  // Collects the best-effort profile-name refresh so it doesn't sit in
  // front of the message insert.
  background: Promise<unknown>[]
): Promise<ContactOutcome | null> {
  // Find an existing contact for this account by phone. The shared
  // helper pre-filters in SQL by the last-8-digit suffix (so we don't
  // pull every contact on every inbound message) then applies the
  // strict `phonesMatch` in JS on the small candidate set. The same
  // helper backs the manual contact form and CSV import, so all three
  // paths agree on what "same number" means (issue #212).
  const existingContact = await findExistingContact(
    supabaseAdmin(),
    accountId,
    phone,
  )

  if (existingContact) {
    // Update name if it changed
    if (name && name !== existingContact.name) {
      background.push(
        settle('[webhook] contact name refresh failed:', () =>
          supabaseAdmin()
            .from('contacts')
            .update({ name, updated_at: new Date().toISOString() })
            .eq('id', existingContact.id)
        )
      )
    }
    return { contact: existingContact, wasCreated: false }
  }

  // Create new contact. account_id is the tenancy column;
  // user_id is the NOT NULL FK audit column (no inbound message
  // has a single "user who created" it — we attribute to the
  // WhatsApp config owner as a stable default).
  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      phone,
      name: name || phone,
    })
    .select()
    .single()

  if (createError) {
    // Lost a race: a concurrent inbound delivery (or another path)
    // created this contact between our lookup and insert, and the
    // unique index (migration 022) rejected the duplicate. Re-resolve
    // the existing row instead of dropping the message.
    if (isUniqueViolation(createError)) {
      const raced = await findExistingContact(supabaseAdmin(), accountId, phone)
      if (raced) return { contact: raced, wasCreated: false }
    }
    console.error('Error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

async function findOrCreateConversation(
  accountId: string,
  configOwnerUserId: string,
  contactId: string,
  connectionId?: string,
) {
  // Look for an existing conversation in this account for this contact.
  const { data: existingRows, error: findError } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .limit(1)

  if (findError) {
    console.error('Error finding conversation:', findError)
    return null
  }

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0]
    // If incoming message belongs to a specific connection, bind it to this conversation
    if (connectionId && existing.whatsapp_connection_id !== connectionId) {
      await supabaseAdmin()
        .from('conversations')
        .update({
          whatsapp_connection_id: connectionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      return {
        conversation: { ...existing, whatsapp_connection_id: connectionId },
        created: false,
      }
    }
    return { conversation: existing, created: false }
  }

  // Create new conversation
  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      contact_id: contactId,
      whatsapp_connection_id: connectionId || null,
    })
    .select()
    .single()

  if (createError) {
    // Race condition handle
    if (isUniqueViolation(createError)) {
      const { data: raced } = await supabaseAdmin()
        .from('conversations')
        .select('*')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .limit(1)
      if (raced && raced.length > 0) {
        if (connectionId && raced[0].whatsapp_connection_id !== connectionId) {
          await supabaseAdmin()
            .from('conversations')
            .update({
              whatsapp_connection_id: connectionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', raced[0].id)
          return {
            conversation: { ...raced[0], whatsapp_connection_id: connectionId },
            created: false,
          }
        }
        return { conversation: raced[0], created: false }
      }
    }
    console.error('Error creating conversation:', createError)
    return null
  }

  return { conversation: newConv, created: true }
}

