import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/billing/razorpay';
import { type PlanId } from '@/lib/billing/plans';

function getServiceSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';
  return createServerSupabase(url, key);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.error('[razorpay-webhook] Invalid signature rejected.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id;
    const eventType = payload.event as string;

    const supabase = getServiceSupabase();

    // 2. Webhook Idempotency Check
    if (eventId) {
      const { data: existingEvent } = await supabase
        .from('billing_webhook_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (existingEvent) {
        // Event already processed - idempotent skip
        return NextResponse.json({ status: 'ignored_duplicate' });
      }

      // Record event in idempotency audit log
      await supabase.from('billing_webhook_events').insert({
        id: eventId,
        event_type: eventType,
        payload,
      });
    }

    const subEntity = payload.payload?.subscription?.entity;
    const paymentEntity = payload.payload?.payment?.entity;
    const notes = subEntity?.notes || paymentEntity?.notes || {};
    const accountId = notes.account_id;
    const planId = (notes.plan_id as PlanId) || 'pro';

    if (!accountId) {
      // Event without associated account
      return NextResponse.json({ status: 'ok', note: 'No account_id in notes' });
    }

    const now = new Date();

    // 3. Handle Subscription Lifecycle Events
    switch (eventType) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.resumed': {
        const periodStart = subEntity?.current_start
          ? new Date(subEntity.current_start * 1000).toISOString()
          : now.toISOString();

        const periodEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('subscriptions')
          .upsert(
            {
              account_id: accountId,
              plan_id: planId,
              razorpay_subscription_id: subEntity?.id || null,
              status: 'active',
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: false,
              updated_at: now.toISOString(),
            },
            { onConflict: 'account_id' },
          );

        // Record payment transaction if payment entity is present
        if (paymentEntity) {
          await supabase.from('payment_transactions').upsert(
            {
              account_id: accountId,
              razorpay_payment_id: paymentEntity.id,
              razorpay_order_id: paymentEntity.order_id || null,
              razorpay_subscription_id: subEntity?.id || null,
              amount: Math.round((paymentEntity.amount || 0) / 100),
              currency: paymentEntity.currency || 'INR',
              status: paymentEntity.status || 'captured',
              payment_method: paymentEntity.method || 'razorpay',
            },
            { onConflict: 'razorpay_payment_id' },
          );
        }
        break;
      }

      case 'subscription.paused': {
        await supabase
          .from('subscriptions')
          .update({
            status: 'paused',
            updated_at: now.toISOString(),
          })
          .eq('account_id', accountId);
        break;
      }

      case 'subscription.cancelled': {
        const periodEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000)
          : null;
        const hasRemainingPeriod = periodEnd && periodEnd > now;

        await supabase
          .from('subscriptions')
          .update({
            status: hasRemainingPeriod ? 'active' : 'cancelled',
            cancel_at_period_end: true,
            updated_at: now.toISOString(),
          })
          .eq('account_id', accountId);
        break;
      }

      case 'subscription.completed':
      case 'subscription.expired': {
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: now.toISOString(),
          })
          .eq('account_id', accountId);
        break;
      }

      case 'payment.failed': {
        await supabase
          .from('subscriptions')
          .update({
            status: 'payment_failed',
            updated_at: now.toISOString(),
          })
          .eq('account_id', accountId);

        if (paymentEntity) {
          await supabase.from('payment_transactions').upsert(
            {
              account_id: accountId,
              razorpay_payment_id: paymentEntity.id,
              razorpay_subscription_id: subEntity?.id || null,
              amount: Math.round((paymentEntity.amount || 0) / 100),
              currency: paymentEntity.currency || 'INR',
              status: 'failed',
              payment_method: paymentEntity.method || 'razorpay',
            },
            { onConflict: 'razorpay_payment_id' },
          );
        }
        break;
      }

      case 'payment.captured':
      case 'payment.authorized': {
        if (paymentEntity) {
          await supabase.from('payment_transactions').upsert(
            {
              account_id: accountId,
              razorpay_payment_id: paymentEntity.id,
              razorpay_order_id: paymentEntity.order_id || null,
              razorpay_subscription_id: subEntity?.id || null,
              amount: Math.round((paymentEntity.amount || 0) / 100),
              currency: paymentEntity.currency || 'INR',
              status: paymentEntity.status || 'captured',
              payment_method: paymentEntity.method || 'razorpay',
            },
            { onConflict: 'razorpay_payment_id' },
          );
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal webhook error';
    console.error('[razorpay-webhook-error]:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

