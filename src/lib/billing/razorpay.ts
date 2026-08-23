import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PLANS, type PlanId } from './plans';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

/**
 * Resolves Razorpay credentials from environment variables or the system_settings database table.
 */
export async function getRazorpayCredentials(): Promise<RazorpayCredentials> {
  const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (envKeySecret) {
    return {
      keyId: envKeyId || 'rzp_default_key',
      keySecret: envKeySecret,
      webhookSecret: envWebhookSecret || envKeySecret,
    };
  }

  // Fallback to dynamic settings in system_settings table
  try {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway')
      .single();

    if (data?.value) {
      const val = data.value as Record<string, unknown>;
      const dbKeyId = String(val.razorpay_key_id || '').trim();
      const dbKeySecret = String(val.razorpay_key_secret || '').trim();
      const dbWebhookSecret = String(val.razorpay_webhook_secret || '').trim();

      if (dbKeySecret) {
        return {
          keyId: dbKeyId || 'rzp_db_key',
          keySecret: dbKeySecret,
          webhookSecret: dbWebhookSecret || dbKeySecret,
        };
      }
    }
  } catch (err) {
    console.warn('[getRazorpayCredentials] Error reading dynamic gateway settings:', err);
  }

  throw new Error('Razorpay credentials are not configured. Please set them in Admin Settings or Environment variables.');
}

/**
 * Synchronous client factory when environment variables are set, or throws.
 */
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
 * Creates dynamic Razorpay client instance.
 */
export async function getDynamicRazorpayClient(): Promise<{ client: Razorpay; creds: RazorpayCredentials }> {
  const creds = await getRazorpayCredentials();
  const client = new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
  return { client, creds };
}

/**
 * Creates or fetches a plan ID in Razorpay for recurring monthly subscription billing.
 */
export async function createOrFetchRazorpayPlan(planId: PlanId): Promise<string> {
  const config = PLANS[planId];
  if (!config || config.price <= 0) {
    throw new Error(`Cannot create Razorpay plan for free/invalid plan: ${planId}`);
  }

  const { client: razorpay } = await getDynamicRazorpayClient();

  // Create a standard monthly plan in Razorpay
  const response = await razorpay.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: `NX CRM ${config.name} Plan`,
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
  const { client: razorpay, creds } = await getDynamicRazorpayClient();
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

  return { subscription, keyId: creds.keyId };
}

/**
 * Verifies the signature returned by Razorpay Checkout after customer authorization.
 */
export async function verifySubscriptionCheckoutSignature({
  paymentId,
  subscriptionId,
  signature,
}: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): Promise<boolean> {
  try {
    const creds = await getRazorpayCredentials();
    const body = `${paymentId}|${subscriptionId}`;
    const expectedSignature = crypto
      .createHmac('sha256', creds.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (err) {
    console.error('[verifySubscriptionCheckoutSignature error]:', err);
    return false;
  }
}

/**
 * Verifies incoming Razorpay Webhook signature against raw request body.
 */
export async function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): Promise<boolean> {
  try {
    const creds = await getRazorpayCredentials();
    const secret = creds.webhookSecret || creds.keySecret;
    if (!secret || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  } catch (err) {
    console.error('[verifyWebhookSignature error]:', err);
    return false;
  }
}

