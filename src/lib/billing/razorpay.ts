import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PLANS, type PlanId } from './plans';

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Creates or fetches a plan ID in Razorpay for recurring monthly subscription billing.
 */
export async function createOrFetchRazorpayPlan(planId: PlanId): Promise<string> {
  const config = PLANS[planId];
  if (!config || config.price <= 0) {
    throw new Error(`Cannot create Razorpay plan for free/invalid plan: ${planId}`);
  }

  const razorpay = getRazorpayClient();

  // Try creating a standard monthly plan in Razorpay
  const response = await razorpay.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: `NX CRM Wechat ${config.name} Plan`,
      amount: config.price * 100, // Razorpay uses paise (1 INR = 100 paise)
      currency: 'INR',
      description: `${config.name} Plan — Monthly Subscription (₹${config.price}/month)`,
    },
    notes: {
      app_plan_id: planId,
    },
  });

  return response.id;
}

/**
 * Creates a new Razorpay subscription instance for checkout.
 */
export async function createSubscriptionInstance({
  planId,
  accountId,
  customerEmail,
}: {
  planId: PlanId;
  accountId: string;
  customerEmail?: string;
}) {
  const razorpay = getRazorpayClient();
  const rzpPlanId = await createOrFetchRazorpayPlan(planId);

  const subscription = await razorpay.subscriptions.create({
    plan_id: rzpPlanId,
    total_count: 60, // 5 years of monthly cycles
    quantity: 1,
    customer_notify: 1,
    notes: {
      account_id: accountId,
      plan_id: planId,
      customer_email: customerEmail || '',
    },
  });

  return subscription;
}

/**
 * Verifies the signature returned by Razorpay Checkout after customer authorization.
 * Official Razorpay checkout returns: razorpay_payment_id, razorpay_subscription_id, razorpay_signature
 * Expected digest: HMAC_SHA256(razorpay_payment_id + '|' + razorpay_subscription_id, secret)
 */
export function verifySubscriptionCheckoutSignature({
  paymentId,
  subscriptionId,
  signature,
}: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const body = `${paymentId}|${subscriptionId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verifies incoming Razorpay Webhook signature against raw request body.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}
