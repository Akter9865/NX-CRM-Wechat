import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const adminSession = await requireAdminSession('manage_subscriptions');
    const { id } = await params;
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const { planId, status, durationMonths, notes } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const months = Number(durationMonths) || 1;
    const isLifetime = months >= 999;
    const startDate = new Date();
    
    let expiryDate: Date | null = null;
    if (isLifetime) {
      expiryDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
    } else if (planId === 'free') {
      expiryDate = null;
    } else {
      expiryDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    }

    const subscriptionPayload: Record<string, unknown> = {
      plan_id: planId,
      status: status || 'active',
      current_period_start: startDate.toISOString(),
      current_period_end: expiryDate ? expiryDate.toISOString() : null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      subscriptionPayload.notes = notes;
    }

    // 1. Upsert subscription
    const { data: updatedSub, error: subErr } = await supabase
      .from('subscriptions')
      .upsert(
        {
          account_id: id,
          ...subscriptionPayload,
        },
        { onConflict: 'account_id' }
      )
      .select('*')
      .single();

    if (subErr) throw subErr;

    // 2. Also update account status to active
    await supabase
      .from('accounts')
      .update({
        status: status || 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 3. Log admin action
    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'client.plan_change',
      targetType: 'subscription',
      targetId: id,
      details: {
        newPlanId: planId,
        status: status || 'active',
        durationMonths: months,
        isLifetime,
        expiryDate: expiryDate ? expiryDate.toISOString() : 'None (Free)',
      },
    });

    const displayDuration = isLifetime
      ? 'Lifetime Access'
      : expiryDate
      ? `valid until ${expiryDate.toLocaleDateString()}`
      : 'Permanent Free Tier';

    return NextResponse.json({
      success: true,
      message: `Client plan updated to ${planId.toUpperCase()} (${displayDuration})`,
      subscription: updatedSub,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update subscription';
    console.error('[Admin Subscription Update Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
