import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { createSubscriptionInstance } from '@/lib/billing/razorpay';

export async function POST(request: Request) {
  try {
    const { account, supabase } = await requireRole('admin');
    const { data: userData } = await supabase.auth.getUser();

    const body = await request.json();
    const planId = body.planId as PlanId;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    if (planId === 'free') {
      return NextResponse.json({ error: 'Free plan does not require checkout.' }, { status: 400 });
    }

    const subscription = await createSubscriptionInstance({
      planId,
      accountId: account.id,
      customerEmail: userData?.user?.email,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      plan: PLANS[planId],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription';
    console.error('[create-subscription error]:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
