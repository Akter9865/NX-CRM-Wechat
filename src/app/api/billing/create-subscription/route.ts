import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { siteConfig } from '@/lib/config/site';

/**
 * Razorpay online subscription checkout is currently disabled.
 * Subscriptions & plan upgrades are handled manually via WhatsApp Support.
 */
export async function POST(request: Request) {
  try {
    const { account } = await requireRole('admin');
    const body = await request.json();
    const planId = body.planId as PlanId;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    if (planId === 'free') {
      return NextResponse.json({ error: 'Free plan does not require checkout.' }, { status: 400 });
    }

    const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
    const plan = PLANS[planId];
    const message = `Hi NX CRM Team! I want to activate/upgrade to the *${plan.name} Plan* (₹${plan.price}/month) for my workspace:
• Workspace: ${account.name}
• Account ID: ${account.id}
Please share payment details (UPI/QR) to activate my subscription.`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json(
      {
        error: 'Razorpay gateway is disabled. Subscriptions are processed manually via WhatsApp Support.',
        disabled: true,
        manual: true,
        whatsappUrl,
        supportPhone: siteConfig.phone,
        plan,
      },
      { status: 403 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Razorpay checkout is disabled';
    return NextResponse.json(
      { error: errorMessage },
      { status: 403 }
    );
  }
}

