import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  verifyWebhookSignature,
  verifySubscriptionCheckoutSignature,
} from '@/lib/billing/razorpay';
import { POST } from './route';

describe('Razorpay Webhook & Checkout Cryptographic Signatures', () => {
  const secret = 'test_webhook_secret_12345';

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    process.env.RAZORPAY_KEY_SECRET = secret;
  });

  describe('verifyWebhookSignature', () => {
    it('validates a valid HMAC SHA256 signature against raw body', () => {
      const rawBody = JSON.stringify({
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_123' } } },
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const isValid = verifyWebhookSignature({ rawBody, signature });
      expect(isValid).toBe(true);
    });

    it('rejects an altered payload with original signature', () => {
      const originalBody = JSON.stringify({ event: 'subscription.charged' });
      const tamperedBody = JSON.stringify({ event: 'subscription.cancelled' });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(originalBody)
        .digest('hex');

      const isValid = verifyWebhookSignature({ rawBody: tamperedBody, signature });
      expect(isValid).toBe(false);
    });

    it('rejects when signature or secret is missing', () => {
      expect(verifyWebhookSignature({ rawBody: 'body', signature: '' })).toBe(false);
    });
  });

  describe('verifySubscriptionCheckoutSignature', () => {
    it('validates checkout return signature paymentId|subscriptionId', () => {
      const paymentId = 'pay_987654321';
      const subscriptionId = 'sub_123456789';

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${paymentId}|${subscriptionId}`)
        .digest('hex');

      const isValid = verifySubscriptionCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: expectedSignature,
      });

      expect(isValid).toBe(true);
    });

    it('rejects invalid checkout signature', () => {
      const isValid = verifySubscriptionCheckoutSignature({
        paymentId: 'pay_1',
        subscriptionId: 'sub_1',
        signature: 'invalid_sig',
      });
      expect(isValid).toBe(false);
    });
  });
});

describe('POST /api/webhooks/razorpay Route Handler', () => {
  const secret = 'test_webhook_secret_12345';

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    process.env.RAZORPAY_KEY_SECRET = secret;
  });

  it('rejects request with 400 if signature header is missing', async () => {
    const req = new Request('http://localhost/api/webhooks/razorpay', {
      method: 'POST',
      body: JSON.stringify({ event: 'subscription.charged' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing webhook signature');
  });

  it('rejects request with 401 if signature is cryptographically invalid', async () => {
    const req = new Request('http://localhost/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': 'invalid_hex_signature',
      },
      body: JSON.stringify({ event: 'subscription.charged' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Invalid webhook signature');
  });
});
