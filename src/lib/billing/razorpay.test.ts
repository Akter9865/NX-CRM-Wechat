import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  verifySubscriptionCheckoutSignature,
  verifyWebhookSignature,
} from './razorpay';

describe('Razorpay Signature Verification', () => {
  const secret = 'test_secret_12345';

  beforeEach(() => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', secret);
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('validates a correct subscription checkout signature', async () => {
    const paymentId = 'pay_Lz1234567890';
    const subscriptionId = 'sub_Sz9876543210';
    const body = `${paymentId}|${subscriptionId}`;
    const validSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const result = await verifySubscriptionCheckoutSignature({
      paymentId,
      subscriptionId,
      signature: validSignature,
    });

    expect(result).toBe(true);
  });

  it('rejects an invalid subscription checkout signature', async () => {
    const result = await verifySubscriptionCheckoutSignature({
      paymentId: 'pay_Lz1234567890',
      subscriptionId: 'sub_Sz9876543210',
      signature: 'invalid_tampered_signature_hex',
    });

    expect(result).toBe(false);
  });

  it('validates a correct webhook signature', async () => {
    const rawBody = JSON.stringify({ event: 'subscription.charged', id: 'evt_123' });
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const result = await verifyWebhookSignature({
      rawBody,
      signature: validSignature,
    });

    expect(result).toBe(true);
  });

  it('rejects an invalid webhook signature', async () => {
    const rawBody = JSON.stringify({ event: 'subscription.charged', id: 'evt_123' });

    const result = await verifyWebhookSignature({
      rawBody,
      signature: 'invalid_webhook_signature',
    });

    expect(result).toBe(false);
  });
});
