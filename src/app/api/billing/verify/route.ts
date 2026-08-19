import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { verifySubscriptionCheckoutSignature } from '@/lib/billing/razorpay';

export async function POST(request: Request) {
  try {
    const { account, supabase } = await requireRole('admin');

    const body = await request.json();
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      planId,
    } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !planId) {
      return NextResponse.json({ error: 'Missing required signature parameters.' }, { status: 400 });
    }

    // 1. Verify HMAC SHA256 Signature
    const isValid = verifySubscriptionCheckoutSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.error('[verify-subscription] Invalid signature verification attempt:', {
        account: account.id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    const targetPlan = PLANS[planId as PlanId] || PLANS.pro;

    // 2. Activate Subscription in Database
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          account_id: account.id,
          plan_id: planId,
          razorpay_subscription_id: razorpay_subscription_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: nextMonth.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'account_id' },
      );

    if (subError) {
      console.error('[verify-subscription] DB subscription update error:', subError);
      throw subError;
    }

    // 3. Record Payment Transaction
    await supabase.from('payment_transactions').insert({
      account_id: account.id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_subscription_id: razorpay_subscription_id,
      amount: targetPlan.price,
      currency: 'INR',
      status: 'captured',
      payment_method: 'razorpay',
    });

    return NextResponse.json({
      success: true,
      planId,
      planName: targetPlan.name,
      message: `Your account has been upgraded to ${targetPlan.name} Plan!`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Subscription verification failed';
    console.error('[verify-subscription error]:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
