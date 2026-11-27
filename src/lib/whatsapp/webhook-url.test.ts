import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getConnectionWebhookUrl,
  getPublicOrigin,
  getSharedWebhookUrl,
} from './webhook-url'

describe('webhook-url', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers NEXT_PUBLIC_SITE_URL over the browser origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.example.com/')
    expect(getPublicOrigin('https://preview-123.vercel.app')).toBe('https://app.example.com')
    expect(getSharedWebhookUrl('https://preview-123.vercel.app')).toBe(
      'https://app.example.com/api/whatsapp/webhook',
    )
  })

  it('falls back to the provided origin when no site URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getPublicOrigin('https://crm.local/')).toBe('https://crm.local')
  })

  it('ignores a site URL without a scheme', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'app.example.com')
    expect(getPublicOrigin('https://crm.local')).toBe('https://crm.local')
  })

  it('builds a dedicated per-connection URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.example.com')
    expect(getConnectionWebhookUrl('7b0c5d1e-1111-4222-8333-944455556666')).toBe(
      'https://app.example.com/api/whatsapp/webhook/7b0c5d1e-1111-4222-8333-944455556666',
    )
  })
})
