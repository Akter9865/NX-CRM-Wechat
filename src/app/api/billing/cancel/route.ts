import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { getRazorpayClient } from '@/lib/billing/razorpay';

export async function POST() {
  try {
    const { account, supabase } = await requireRole('admin');

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('account_id', account.id)
      .maybeSingle();

    if (!sub || sub.plan_id === 'free') {
      return NextResponse.json({ error: 'No active paid subscription to cancel.' }, { status: 400 });
    }

    // If there is an active Razorpay subscription, request cancellation at cycle end
    if (sub.razorpay_subscription_id) {
      try {
        const razorpay = getRazorpayClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (razorpay.subscriptions as any).cancel(sub.razorpay_subscription_id, true);
      } catch (rzpErr) {
        console.warn('[cancel-subscription] Razorpay cancel notice:', rzpErr);
      }
    }

    // Mark cancel at period end in database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', account.id);

    return NextResponse.json({
      success: true,
      message: `Your subscription will remain active until the end of your billing cycle: ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'end of period'}.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
    console.error('[cancel-subscription error]:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
