import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: (val: unknown) => unknown) => resolve({ data: [], error: null }),
      }),
    }),
  }),
}));

import { GET, _resetRecentlyProcessedMessagesForTest } from './route';

describe('WhatsApp Webhook GET verification', () => {
  beforeEach(() => {
    _resetRecentlyProcessedMessagesForTest();
  });

  it('validates default wacrm_verify_token and echoes back challenge', async () => {
    const challenge = 'test_challenge_12345';
    const request = new Request(
      `https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=${challenge}&hub.verify_token=wacrm_verify_token`
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(challenge);
  });

  it('validates wacrm_verify_token even with trailing whitespace', async () => {
    const challenge = 'test_challenge_whitespace';
    const request = new Request(
      `https://example.com/api/whatsapp/webhook?hub.mode=subscribe%20&hub.challenge=${challenge}&hub.verify_token=wacrm_verify_token%20`
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe(challenge);
  });

  it('rejects request with missing parameters', async () => {
    const request = new Request(
      'https://example.com/api/whatsapp/webhook?hub.mode=subscribe'
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing verification parameters');
  });

  it('rejects invalid verify token', async () => {
    const request = new Request(
      'https://example.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=completely_wrong_token'
    );

    const response = await GET(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Verification token mismatch');
  });
});
