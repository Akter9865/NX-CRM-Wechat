import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared, hoisted state the module mocks close over. Reset per test.
const h = vi.hoisted(() => ({
  runAutomationsForTrigger: vi.fn(),
  dispatchInboundToFlows: vi.fn(),
  dispatchInboundToAiReply: vi.fn(),
  dispatchWebhookEvent: vi.fn(),
  state: {
    // Result the message upsert's .select() resolves to. A genuine insert
    // returns the row; a replayed delivery conflicts and returns [].
    messageUpsertResult: [{ id: 'msg-1' }] as { id: string }[],
    priorCustomerMsgCount: 0,
    /** Row `lookupInternalIdByMetaId` resolves for a `context.id`. */
    replyContextParent: null as { id: string } | null,
    conversation: { id: 'conv-1', unread_count: 0, account_id: 'acc-1' },
    upsertCalls: [] as { row: Record<string, unknown>; options: unknown }[],
    /** Error the message upsert resolves with (all attempts), if any. */
    messageUpsertError: null as { message: string; code?: string } | null,
    /** UPDATEs against `messages`: the post-insert media patch and status writes. */
    messageUpdates: [] as {
      values: Record<string, unknown>
      filters: [string, ...unknown[]][]
    }[],
    /** Rows a status-driven `messages` UPDATE ... RETURNING yields. */
    statusUpdateRows: [] as Record<string, unknown>[],
    /** Conditional UPDATEs against broadcast_recipients (status path). */
    recipientUpdates: [] as {
      values: Record<string, unknown>
      filters: [string, ...unknown[]][]
    }[],
    /** Ordered log of interesting side effects, for sequencing assertions. */
    events: [] as string[],
    rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
    afterCallbacks: [] as (() => Promise<void> | void)[],
    automationStarted: 0,
    automationCompleted: 0,
    /** whatsapp_config.mirror_inbound_media for the matched row (#466). */
    mirrorInboundMedia: true as boolean | undefined,
    /** Objects the inbound-media mirror pushed into chat-media. */
    storageUploads: [] as {
      bucket: string
      path: string
      options: { contentType?: string }
    }[],
    /** Error the next storage upload resolves with, if any. */
    storageUploadError: null as { message: string } | null,
  },
}))

vi.mock('next/server', () => ({
  after: (cb: () => Promise<void> | void) => {
    h.state.afterCallbacks.push(cb)
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, init }),
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from(table: string) {
      switch (table) {
        case 'whatsapp_config': {
          const cfgData = [
            {
              id: 'cfg-1',
              account_id: 'acc-1',
              user_id: 'user-1',
              access_token: 'enc',
              mirror_inbound_media: h.state.mirrorInboundMedia,
            },
          ]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cfgChain: any = {
            eq: () => cfgChain,
            order: () => cfgChain,
            limit: () => cfgChain,
            then: (resolve: (val: any) => any) =>
              Promise.resolve({ data: cfgData, error: null }).then(resolve),
          }
          return {
            select: () => cfgChain,
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          }
        }
        case 'conversations': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const convChain: any = {
            eq: () => convChain,
            is: () => convChain,
            order: () => convChain,
            limit: () =>
              Promise.resolve({
                data: [h.state.conversation],
                error: null,
              }),
            single: () =>
              Promise.resolve({
                data: h.state.conversation,
                error: null,
              }),
            maybeSingle: () =>
              Promise.resolve({
                data: h.state.conversation,
                error: null,
              }),
            select: () => convChain,
          }
          return {
            select: () => convChain,
            insert: () => convChain,
            update: () => convChain,
          }
        }
        case 'broadcast_recipients':
          // flagBroadcastReplyIfAny: select().eq().eq().in().order().limit()
          // status path: update().eq().in() — one conditional UPDATE
          return {
            update: (values: Record<string, unknown>) => {
              const entry = { values, filters: [] as [string, ...unknown[]][] }
              h.state.recipientUpdates.push(entry)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const chain: any = {
                eq: (...a: unknown[]) => {
                  entry.filters.push(['eq', ...a])
                  return chain
                },
                in: (...a: unknown[]) => {
                  entry.filters.push(['in', ...a])
                  return chain
                },
                then: (resolve: (v: unknown) => unknown) =>
                  Promise.resolve({ data: null, error: null }).then(resolve),
              }
              return chain
            },
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      limit: () =>
                        Promise.resolve({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }
        case 'messages':
          return {
            // Two different chains land here, told apart by the count
            // option: the prior-message count (head request) and the
            // reply-context parent lookup.
            select: (_columns: string, options?: { head?: boolean }) =>
              options?.head
                ? // priorCustomerMsgCount: select('id',{count,head}).eq().eq()
                  {
                    eq: () => ({
                      eq: () =>
                        Promise.resolve({
                          count: h.state.priorCustomerMsgCount,
                          error: null,
                        }),
                    }),
                  }
                : {
                    eq: () => ({
                      eq: () => ({
                        // lookupInternalIdByMetaId: select('id').eq().eq().maybeSingle()
                        maybeSingle: () =>
                          Promise.resolve({
                            data: h.state.replyContextParent,
                            error: null,
                          }),
                        // prior-customer-message probe: select('id').eq().eq().limit(1)
                        limit: () =>
                          Promise.resolve({
                            data:
                              h.state.priorCustomerMsgCount > 0
                                ? [{ id: 'prior-msg' }]
                                : [],
                            error: null,
                          }),
                      }),
                    }),
                  },
            // Idempotent insert: upsert(...).select('id')
            upsert: (row: Record<string, unknown>, options: unknown) => {
              h.state.upsertCalls.push({ row, options })
              h.state.events.push('message.upsert')
              return {
                select: () =>
                  Promise.resolve(
                    h.state.messageUpsertError
                      ? { data: null, error: h.state.messageUpsertError }
                      : { data: h.state.messageUpsertResult, error: null },
                  ),
              }
            },
            // Media patch: update().eq('id') / status: update().eq().not?().select()
            update: (values: Record<string, unknown>) => {
              const entry = { values, filters: [] as [string, ...unknown[]][] }
              h.state.messageUpdates.push(entry)
              h.state.events.push('message.update')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const chain: any = {
                eq: (...a: unknown[]) => {
                  entry.filters.push(['eq', ...a])
                  return chain
                },
                not: (...a: unknown[]) => {
                  entry.filters.push(['not', ...a])
                  return chain
                },
                select: () =>
                  Promise.resolve({ data: h.state.statusUpdateRows, error: null }),
                then: (resolve: (v: unknown) => unknown) =>
                  Promise.resolve({ data: null, error: null }).then(resolve),
              }
              return chain
            },
          }
        default:
          throw new Error(`unexpected table: ${table}`)
      }
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      h.state.rpcCalls.push({ name, args })
      return Promise.resolve({ data: null, error: null })
    },
    // Service-role Storage, used by the inbound-media mirror (#466).
    storage: {
      from(bucket: string) {
        return {
          upload: (
            path: string,
            _body: unknown,
            options: { contentType?: string },
          ) => {
            h.state.storageUploads.push({ bucket, path, options })
            return Promise.resolve({ error: h.state.storageUploadError })
          },
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://cdn.test/${bucket}/${path}` },
          }),
        }
      },
    },
  }),
}))

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: () => 'plain-token',
  encrypt: (v: string) => v,
  isLegacyFormat: () => false,
}))
vi.mock('@/lib/whatsapp/meta-api', () => ({
  getMediaUrl: vi.fn(),
  downloadMedia: vi.fn(),
}))
vi.mock('@/lib/contacts/dedupe', () => ({
  findExistingContact: vi.fn(async () => ({
    id: 'contact-1',
    name: 'Ada',
    phone: '15551230000',
  })),
  isUniqueViolation: () => false,
}))
vi.mock('@/lib/whatsapp/webhook-signature', () => ({
  verifyMetaWebhookSignature: () => true,
}))
vi.mock('@/lib/whatsapp/template-webhook', () => ({
  isTemplateWebhookField: () => false,
  handleTemplateWebhookChange: vi.fn(),
}))
vi.mock('@/lib/automations/engine', () => ({
  runAutomationsForTrigger: h.runAutomationsForTrigger,
}))
vi.mock('@/lib/flows/engine', () => ({
  dispatchInboundToFlows: h.dispatchInboundToFlows,
}))
vi.mock('@/lib/webhooks/deliver', () => ({
  dispatchWebhookEvent: h.dispatchWebhookEvent,
}))

import { POST, _resetRecentlyProcessedMessagesForTest } from './route'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'

const mockGetMediaUrl = vi.mocked(getMediaUrl)
const mockDownloadMedia = vi.mocked(downloadMedia)

const TEXT_MESSAGE = {
  id: 'wamid.TEST1',
  from: '15551230000',
  timestamp: '1700000000',
  type: 'text',
  text: { body: 'hello' },
}

function inboundRequest(message: Record<string, unknown> = TEXT_MESSAGE) {
  const body = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: 'pn-1' },
              contacts: [{ wa_id: '15551230000', profile: { name: 'Ada' } }],
              messages: [message],
            },
          },
        ],
      },
    ],
  }
  return {
    text: async () => JSON.stringify(body),
    headers: { get: () => 'sha256=stub' },
  } as unknown as Request
}

function rawRequest(body: unknown) {
  return {
    text: async () => JSON.stringify(body),
    headers: { get: () => 'sha256=stub' },
  } as unknown as Request
}

async function runRaw(body: unknown) {
  const res = await POST(rawRequest(body))
  for (const cb of h.state.afterCallbacks) await cb()
  h.state.afterCallbacks = []
  return res
}

async function runWebhook(message?: Record<string, unknown>) {
  const res = await POST(inboundRequest(message))
  // Drain the after() callback exactly as the runtime would.
  for (const cb of h.state.afterCallbacks) await cb()
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  _resetRecentlyProcessedMessagesForTest()
  h.state.messageUpsertResult = [{ id: 'msg-1' }]
  h.state.priorCustomerMsgCount = 0
  h.state.replyContextParent = null
  h.state.conversation = { id: 'conv-1', unread_count: 0, account_id: 'acc-1' }
  h.state.upsertCalls = []
  h.state.messageUpsertError = null
  h.state.messageUpdates = []
  h.state.statusUpdateRows = []
  h.state.recipientUpdates = []
  h.state.events = []
  h.state.rpcCalls = []
  h.state.afterCallbacks = []
  h.state.automationStarted = 0
  h.state.automationCompleted = 0
  h.state.mirrorInboundMedia = true
  h.state.storageUploads = []
  h.state.storageUploadError = null
  mockGetMediaUrl.mockResolvedValue({
    url: 'https://lookaside.fbsbx.com/whatsapp/abc',
    mimeType: 'image/jpeg',
    fileSize: 2048,
  })
  mockDownloadMedia.mockResolvedValue({
    buffer: Buffer.alloc(2048),
    contentType: 'image/jpeg',
  })
  h.dispatchInboundToFlows.mockResolvedValue({ consumed: false })
  h.dispatchInboundToAiReply.mockResolvedValue(undefined)
  h.dispatchWebhookEvent.mockResolvedValue(undefined)
  h.runAutomationsForTrigger.mockImplementation(() => {
    h.state.automationStarted++
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        h.state.automationCompleted++
        resolve()
      }, 0)
    })
  })
})

describe('inbound webhook: idempotent insert (#367)', () => {
  it('a genuine first delivery persists once and fans out downstream', async () => {
    await runWebhook()

    // Inserted via upsert with the (conversation_id, message_id) conflict
    // target — not a bare insert.
    expect(h.state.upsertCalls).toHaveLength(1)
    expect(h.state.upsertCalls[0].options).toMatchObject({
      onConflict: 'conversation_id,message_id',
      ignoreDuplicates: true,
    })
    // Downstream side effects ran exactly once.
    expect(h.state.rpcCalls).toHaveLength(1)
    expect(h.dispatchInboundToFlows).toHaveBeenCalledTimes(1)
    expect(h.dispatchWebhookEvent).toHaveBeenCalledTimes(1)
  })

  it('a replayed delivery is a no-op: no unread bump, no fan-out', async () => {
    // Upsert hits the unique index and returns no row.
    h.state.messageUpsertResult = []

    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(1)
    // None of the downstream side effects fire on a replay.
    expect(h.state.rpcCalls).toHaveLength(0)
    expect(h.dispatchInboundToFlows).not.toHaveBeenCalled()
    expect(h.runAutomationsForTrigger).not.toHaveBeenCalled()
    expect(h.dispatchInboundToAiReply).not.toHaveBeenCalled()
    expect(h.dispatchWebhookEvent).not.toHaveBeenCalled()
  })
})

describe('inbound webhook: atomic unread bump (#369)', () => {
  it('increments unread through the DB-side RPC, not a read-modify-write', async () => {
    await runWebhook()

    expect(h.state.rpcCalls).toHaveLength(1)
    expect(['update_conversation_on_inbound', 'bump_conversation_on_inbound']).toContain(
      h.state.rpcCalls[0].name
    )
    expect(h.state.rpcCalls[0].args).toMatchObject({
      p_conversation_id: 'conv-1',
    })
  })
})

describe('inbound webhook: template quick-reply buttons (#478)', () => {
  // A customer tapping a QUICK_REPLY button on a broadcast template.
  // `context.id` points at the template message we sent — which the
  // broadcast path never wrote to `messages`, so the parent lookup
  // legitimately misses and the reply is stored unquoted.
  const templateButtonTap = {
    id: 'wamid.BTN1',
    from: '15551230000',
    timestamp: '1700000000',
    type: 'button',
    button: { text: 'Yes, interested', payload: 'YES_INTERESTED' },
    context: { id: 'wamid.BROADCAST1' },
  }

  it('stores the tap as an interactive reply, not an unsupported message', async () => {
    await runWebhook(templateButtonTap)

    expect(h.state.upsertCalls).toHaveLength(1)
    expect(h.state.upsertCalls[0].row).toMatchObject({
      content_type: 'interactive',
      content_text: 'Yes, interested',
      interactive_reply_id: 'YES_INTERESTED',
      reply_to_message_id: null,
    })
  })

  it('routes the tap to flows and fires the interactive_reply trigger', async () => {
    await runWebhook(templateButtonTap)

    expect(h.dispatchInboundToFlows).toHaveBeenCalledWith(
      expect.objectContaining({
        message: {
          kind: 'interactive_reply',
          reply_id: 'YES_INTERESTED',
          reply_title: 'Yes, interested',
          meta_message_id: 'wamid.BTN1',
        },
      }),
    )
    const triggers = h.runAutomationsForTrigger.mock.calls.map(
      (call) => (call[0] as { triggerType: string }).triggerType,
    )
    expect(triggers).toContain('interactive_reply')
    // The AI auto-reply must stay out of it — a button tap is not a
    // free-text question.
    expect(h.dispatchInboundToAiReply).not.toHaveBeenCalled()
  })

  it('falls back to the label when the template button carries no payload', async () => {
    await runWebhook({
      ...templateButtonTap,
      button: { text: 'Track my order' },
    })

    expect(h.state.upsertCalls[0].row).toMatchObject({
      content_type: 'interactive',
      content_text: 'Track my order',
      interactive_reply_id: 'Track my order',
    })
  })
})

describe('inbound webhook: inbound media is mirrored (#466)', () => {
  const IMAGE_MESSAGE = {
    id: 'wamid.IMG1',
    from: '15551230000',
    timestamp: '1700000000',
    type: 'image',
    image: { id: '1234567890123456', mime_type: 'image/jpeg', caption: 'hi' },
  }

  it('stores a durable bucket URL instead of the expiring proxy path', async () => {
    await runWebhook(IMAGE_MESSAGE)

    expect(h.state.storageUploads).toHaveLength(1)
    expect(h.state.storageUploads[0].bucket).toBe('chat-media')
    expect(h.state.storageUploads[0].path).toBe(
      'account-acc-1/inbound/1234567890123456-image-1700000000.jpg',
    )
    // The row lands immediately with the (renderable) proxy URL…
    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/1234567890123456',
      // Meta's MIME type used to be discarded outright (`void mediaType`).
      media_type: 'image/jpeg',
    })
    // …and is patched to the durable bucket URL once the mirror lands.
    expect(h.state.messageUpdates).toHaveLength(1)
    expect(h.state.messageUpdates[0].values).toEqual({
      media_url:
        'https://cdn.test/chat-media/account-acc-1/inbound/1234567890123456-image-1700000000.jpg',
    })
    expect(h.state.messageUpdates[0].filters).toContainEqual(['eq', 'id', 'msg-1'])
  })

  it('inserts the message BEFORE touching Meta for the media', async () => {
    mockGetMediaUrl.mockImplementation(async () => {
      h.state.events.push('meta.getMediaUrl')
      return {
        url: 'https://lookaside.fbsbx.com/whatsapp/abc',
        mimeType: 'image/jpeg',
        fileSize: 2048,
      }
    })

    await runWebhook(IMAGE_MESSAGE)

    expect(h.state.events.indexOf('message.upsert')).toBeGreaterThanOrEqual(0)
    expect(h.state.events.indexOf('message.upsert')).toBeLessThan(
      h.state.events.indexOf('meta.getMediaUrl'),
    )
  })

  it('keeps the proxy URL when Meta media lookup fails', async () => {
    mockGetMediaUrl.mockRejectedValueOnce(new Error('Media fetch failed: 500'))

    await runWebhook(IMAGE_MESSAGE)

    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/1234567890123456',
    })
    expect(h.state.messageUpdates).toHaveLength(0)
  })

  it('falls back to the proxy URL when the upload is refused', async () => {
    h.state.storageUploadError = { message: 'mime type not supported' }

    await runWebhook(IMAGE_MESSAGE)

    // The message still lands, and it still lands with a usable URL —
    // the mirror failing must never cost us the message.
    expect(h.state.upsertCalls).toHaveLength(1)
    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/1234567890123456',
      media_type: 'image/jpeg',
    })
    expect(h.state.messageUpdates).toHaveLength(0)
  })

  it('falls back to the proxy URL when the download from Meta throws', async () => {
    mockDownloadMedia.mockRejectedValueOnce(new Error('Media download failed: 404'))

    await runWebhook(IMAGE_MESSAGE)

    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/1234567890123456',
    })
  })

  it('skips media larger than the bucket accepts, without downloading it', async () => {
    mockGetMediaUrl.mockResolvedValue({
      url: 'https://lookaside.fbsbx.com/whatsapp/big',
      mimeType: 'application/pdf',
      fileSize: 40 * 1024 * 1024,
    })

    await runWebhook({
      id: 'wamid.DOC1',
      from: '15551230000',
      timestamp: '1700000000',
      type: 'document',
      document: {
        id: '999',
        mime_type: 'application/pdf',
        filename: 'huge.pdf',
      },
    })

    expect(mockDownloadMedia).not.toHaveBeenCalled()
    expect(h.state.storageUploads).toHaveLength(0)
    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/999',
      media_type: 'application/pdf',
    })
  })

  it("names the object after a document's own filename", async () => {
    mockGetMediaUrl.mockResolvedValue({
      url: 'https://lookaside.fbsbx.com/whatsapp/doc',
      mimeType: 'application/pdf',
      fileSize: 4096,
    })
    mockDownloadMedia.mockResolvedValue({
      buffer: Buffer.alloc(4096),
      contentType: 'application/pdf',
    })

    await runWebhook({
      id: 'wamid.DOC2',
      from: '15551230000',
      timestamp: '1700000000',
      type: 'document',
      document: {
        id: '1234567890123456',
        mime_type: 'application/pdf',
        filename: 'invoice.pdf',
        caption: 'have a look',
      },
    })

    expect(h.state.storageUploads[0].path).toBe(
      'account-acc-1/inbound/1234567890123456-invoice.pdf',
    )
    expect(h.state.upsertCalls[0].row).toMatchObject({
      content_text: 'have a look',
      media_url: '/api/whatsapp/media/1234567890123456',
    })
  })

  it('does not mirror when the account has opted out', async () => {
    h.state.mirrorInboundMedia = false

    await runWebhook(IMAGE_MESSAGE)

    // No Meta round trip at all on the opt-out path.
    expect(mockGetMediaUrl).not.toHaveBeenCalled()
    expect(mockDownloadMedia).not.toHaveBeenCalled()
    expect(h.state.storageUploads).toHaveLength(0)
    expect(h.state.upsertCalls[0].row).toMatchObject({
      media_url: '/api/whatsapp/media/1234567890123456',
      // Still recorded — the MIME type costs nothing and makes the
      // download name right even for proxied media.
      media_type: 'image/jpeg',
    })
  })

  it('mirrors when the column is absent, e.g. a row read before migration 039', async () => {
    h.state.mirrorInboundMedia = undefined

    await runWebhook(IMAGE_MESSAGE)

    expect(h.state.storageUploads).toHaveLength(1)
  })

  it('leaves text messages alone', async () => {
    await runWebhook()

    expect(mockGetMediaUrl).not.toHaveBeenCalled()
    expect(h.state.storageUploads).toHaveLength(0)
    expect(h.state.upsertCalls[0].row).toMatchObject({ media_type: null })
  })
})

describe('inbound webhook: after() awaits automations (#368)', () => {
  it('every triggered automation settles before the after() callback resolves', async () => {
    await runWebhook()

    // first_inbound_message + new_message_received + keyword_match.
    expect(h.state.automationStarted).toBe(3)
    // If the dispatches were fire-and-forget, completed would still be 0
    // here — the callback would have resolved before the timers fired.
    expect(h.state.automationCompleted).toBe(3)
  })
})

describe('inbound webhook: first-inbound detection', () => {
  it('fires first_inbound_message when the thread has no customer message yet', async () => {
    h.state.priorCustomerMsgCount = 0
    await runWebhook()
    const triggers = h.runAutomationsForTrigger.mock.calls.map(
      (call) => (call[0] as { triggerType: string }).triggerType,
    )
    expect(triggers).toContain('first_inbound_message')
  })

  it('does not fire first_inbound_message once the customer has written before', async () => {
    h.state.priorCustomerMsgCount = 3
    await runWebhook()
    const triggers = h.runAutomationsForTrigger.mock.calls.map(
      (call) => (call[0] as { triggerType: string }).triggerType,
    )
    expect(triggers).not.toContain('first_inbound_message')
    expect(h.dispatchInboundToFlows).toHaveBeenCalledWith(
      expect.objectContaining({ isFirstInboundMessage: false }),
    )
  })
})

describe('inbound webhook: fan-out isolation', () => {
  it('a throwing flow dispatch still lets automations and message.received run', async () => {
    h.dispatchInboundToFlows.mockRejectedValueOnce(new Error('flows down'))

    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(1)
    expect(h.runAutomationsForTrigger).toHaveBeenCalled()
    expect(h.dispatchWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      'acc-1',
      'message.received',
      expect.objectContaining({ whatsapp_message_id: 'wamid.TEST1' }),
    )
  })
})

describe('inbound webhook: lost-message protection', () => {
  it('retries a transient insert failure once', async () => {
    h.state.messageUpsertError = { message: 'fetch failed', code: '' }

    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(2)
  })

  it('does not retry a permanent (constraint) insert failure', async () => {
    h.state.messageUpsertError = { message: 'violates check', code: '23514' }

    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(1)
  })

  it('a failed delivery does not poison the in-memory dedupe for a redelivery', async () => {
    h.state.messageUpsertError = { message: 'violates check', code: '23514' }
    await runWebhook()
    expect(h.state.upsertCalls).toHaveLength(1)

    // Meta redelivers the same wamid; this time the DB accepts it.
    h.state.messageUpsertError = null
    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(2)
    expect(h.dispatchInboundToFlows).toHaveBeenCalledTimes(1)
  })

  it('a successful delivery still short-circuits an immediate redelivery', async () => {
    await runWebhook()
    await runWebhook()

    expect(h.state.upsertCalls).toHaveLength(1)
  })
})

describe('inbound webhook: batched deliveries', () => {
  function batch(messages: Record<string, unknown>[]) {
    return {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'pn-1' },
                contacts: messages.map((m) => ({
                  wa_id: m.from,
                  profile: { name: 'Ada' },
                })),
                messages,
              },
            },
          ],
        },
      ],
    }
  }

  it("keeps one sender's messages in payload order", async () => {
    await runRaw(
      batch(
        ['A', 'B', 'C'].map((n, i) => ({
          id: `wamid.SEQ${n}`,
          from: '15551230000',
          timestamp: String(1700000000 + i),
          type: 'text',
          text: { body: n },
        })),
      ),
    )

    expect(h.state.upsertCalls.map((c) => c.row.message_id)).toEqual([
      'wamid.SEQA',
      'wamid.SEQB',
      'wamid.SEQC',
    ])
  })

  it('processes every message in the batch', async () => {
    await runRaw(
      batch(
        ['15551230000', '15551230001', '15551230002'].map((from, i) => ({
          id: `wamid.MULTI${i}`,
          from,
          timestamp: '1700000000',
          type: 'text',
          text: { body: 'hi' },
        })),
      ),
    )

    expect(h.state.upsertCalls).toHaveLength(3)
    expect(h.dispatchInboundToFlows).toHaveBeenCalledTimes(3)
  })
})

describe('status webhook', () => {
  function statusBody(status: string, id = 'wamid.OUT1') {
    return {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'pn-1' },
                statuses: [
                  { id, status, timestamp: '1700000100', recipient_id: '15551230000' },
                ],
              },
            },
          ],
        },
      ],
    }
  }

  it('never regresses a message down the ladder (late "delivered" after "read")', async () => {
    await runRaw(statusBody('delivered'))

    expect(h.state.messageUpdates).toHaveLength(1)
    expect(h.state.messageUpdates[0].values).toEqual({ status: 'delivered' })
    expect(h.state.messageUpdates[0].filters).toContainEqual(['eq', 'message_id', 'wamid.OUT1'])
    expect(h.state.messageUpdates[0].filters).toContainEqual(['not', 'status', 'in', '(read)'])
  })

  it('guards the broadcast recipient transition in the same UPDATE', async () => {
    await runRaw(statusBody('read'))

    expect(h.state.recipientUpdates).toHaveLength(1)
    expect(h.state.recipientUpdates[0].values).toMatchObject({ status: 'read' })
    expect(h.state.recipientUpdates[0].filters).toContainEqual([
      'in',
      'status',
      ['pending', 'sent', 'delivered'],
    ])
  })

  it('only lets "failed" land on pre-delivery recipients', async () => {
    await runRaw(statusBody('failed'))

    expect(h.state.recipientUpdates[0].filters).toContainEqual([
      'in',
      'status',
      ['pending', 'sent'],
    ])
    // messages keep their unconditional failed write
    expect(h.state.messageUpdates[0].filters.some((f) => f[0] === 'not')).toBe(false)
  })

  it('dispatches message.status_updated using the account returned by the update', async () => {
    h.state.statusUpdateRows = [
      { conversation_id: 'conv-1', conversations: { account_id: 'acc-1' } },
    ]

    await runRaw(statusBody('delivered'))

    expect(h.dispatchWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      'acc-1',
      'message.status_updated',
      expect.objectContaining({
        whatsapp_message_id: 'wamid.OUT1',
        conversation_id: 'conv-1',
        status: 'delivered',
      }),
    )
  })

  it('does not dispatch when no stored message matched (e.g. broadcast sends)', async () => {
    await runRaw(statusBody('delivered'))
    expect(h.dispatchWebhookEvent).not.toHaveBeenCalled()
  })
})
