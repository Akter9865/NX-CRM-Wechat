import { describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: (val: unknown) => unknown) => resolve({ data: [], error: null }),
      }),
    }),
  }),
}))

import { GET } from './route'

const CONN = '7b0c5d1e-1111-4222-8333-944455556666'
const params = (connectionId: string) => ({ params: Promise.resolve({ connectionId }) })

describe('per-connection WhatsApp webhook', () => {
  it('echoes the challenge for a valid verify token', async () => {
    const res = await GET(
      new Request(
        `https://example.com/api/whatsapp/webhook/${CONN}?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=wacrm_verify_token`,
      ),
      params(CONN),
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('abc123')
  })

  it('rejects a wrong verify token', async () => {
    const res = await GET(
      new Request(
        `https://example.com/api/whatsapp/webhook/${CONN}?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=nope`,
      ),
      params(CONN),
    )
    expect(res.status).toBe(403)
  })

  it('404s on a malformed connection id', async () => {
    const res = await GET(
      new Request('https://example.com/api/whatsapp/webhook/not-a-uuid?hub.mode=subscribe&hub.challenge=a&hub.verify_token=wacrm_verify_token'),
      params('not-a-uuid'),
    )
    expect(res.status).toBe(404)
  })
})
