import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin/auth';
import { getSuperAdminServiceClient } from '@/lib/superadmin/admin-client';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { logAuditEvent } from '@/lib/audit/log';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: accountId } = await props.params;
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      plan_id,
      status = 'active',
      current_period_end,
      cancel_at_period_end = false,
      reason = 'Manual SuperAdmin override',
    } = body;

    if (!plan_id || !PLANS[plan_id as PlanId]) {
      return NextResponse.json(
        { error: `Invalid plan_id: ${plan_id}. Must be one of: free, pro, business, enterprise` },
        { status: 400 }
      );
    }

    const validStatuses = ['active', 'trialing', 'past_due', 'paused', 'cancelled', 'expired', 'payment_failed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSuperAdminServiceClient();

    // Verify account exists
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .maybeSingle();

    if (accErr || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get previous subscription details for audit
    const { data: prevSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    // Calculate or sanitize period end
    let calculatedPeriodEnd = current_period_end;
    if (!calculatedPeriodEnd) {
      if (plan_id === 'free') {
        calculatedPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        // default 1 month from now
        calculatedPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const subscriptionPayload = {
      account_id: accountId,
      plan_id,
      status,
      current_period_start: prevSub?.current_period_start || new Date().toISOString(),
      current_period_end: calculatedPeriodEnd,
      cancel_at_period_end: Boolean(cancel_at_period_end),
      updated_at: new Date().toISOString(),
    };

    // Upsert subscription
    const { data: updatedSub, error: subErr } = await supabase
      .from('subscriptions')
      .upsert(subscriptionPayload, { onConflict: 'account_id' })
      .select()
      .single();

    if (subErr) {
      console.error('[superadmin-subscription] update error:', subErr);
      throw subErr;
    }

    // Log the SuperAdmin audit event
    await logAuditEvent({
      accountId,
      actorUserId: null,
      action: 'superadmin_subscription_override',
      targetType: 'subscription',
      targetId: updatedSub.id,
      metadata: {
        adminEmail: session.email,
        oldPlan: prevSub?.plan_id || 'none',
        newPlan: plan_id,
        oldStatus: prevSub?.status || 'none',
        newStatus: status,
        periodEnd: calculatedPeriodEnd,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated subscription for ${account.name} to ${PLANS[plan_id as PlanId].name}`,
      subscription: updatedSub,
    });
  } catch (error: unknown) {
    console.error('[superadmin-subscription] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update client subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
