import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { verifyPaymentSignature } from '@/lib/billing/razorpay';

export async function POST(request: Request) {
  try {
    const { account, supabase } = await requireRole('admin');

    const body = await request.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_signature,
      planId,
    } = body;

    if (!razorpay_payment_id || !razorpay_signature || !planId) {
      return NextResponse.json({ error: 'Missing required payment verification parameters.' }, { status: 400 });
    }

    // 1. Verify HMAC SHA256 Signature
    const isValid = await verifyPaymentSignature({
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.error('[verify-payment] Invalid signature verification attempt:', {
        account: account.id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    const targetPlan = PLANS[planId as PlanId] || PLANS.pro;

    // 2. Activate Subscription in Database (+30 days)
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          account_id: account.id,
          plan_id: planId,
          razorpay_subscription_id: razorpay_subscription_id || razorpay_order_id || null,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: nextMonth.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        { onConflict: 'account_id' },
      );

    if (subError) {
      console.error('[verify-payment] DB subscription update error:', subError);
      throw subError;
    }

    // 3. Sync account status to 'active'
    await supabase
      .from('accounts')
      .update({ status: 'active', updated_at: now.toISOString() })
      .eq('id', account.id);

    // 4. Record Payment Transaction
    await supabase.from('payment_transactions').insert({
      account_id: account.id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id || null,
      razorpay_subscription_id: razorpay_subscription_id || null,
      amount: targetPlan.price,
      currency: 'INR',
      status: 'captured',
      payment_method: 'razorpay',
    });

    return NextResponse.json({
      success: true,
      planId,
      planName: targetPlan.name,
      message: `🎉 Success! Your workspace is now upgraded to ${targetPlan.name} Plan!`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Payment verification failed';
    console.error('[verify-payment error]:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
