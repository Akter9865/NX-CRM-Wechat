import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('manage_subscriptions');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const [
      { data: subscriptions, error: subErr },
      { data: accounts },
      { data: plans },
      { data: profiles },
    ] = await Promise.all([
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('id, name, created_at, status'),
      supabase.from('plans').select('*'),
      supabase.from('profiles').select('account_id, full_name, email, account_role'),
    ]);

    if (subErr) throw subErr;

    const accMap = new Map<string, NonNullable<typeof accounts>[number]>();
    accounts?.forEach((a) => accMap.set(a.id, a));

    const planMap = new Map<string, NonNullable<typeof plans>[number]>();
    plans?.forEach((p) => planMap.set(p.id, p));

    const ownerMap = new Map<string, NonNullable<typeof profiles>[number]>();
    profiles?.forEach((prof) => {
      if (prof.account_id && (!ownerMap.has(prof.account_id) || prof.account_role === 'owner')) {
        ownerMap.set(prof.account_id, prof);
      }
    });

    let list = (subscriptions || []).map((sub) => {
      const acc = accMap.get(sub.account_id);
      const p = planMap.get(sub.plan_id) || {
        id: sub.plan_id,
        name: sub.plan_id.toUpperCase(),
        price: 0,
      };
      const owner = ownerMap.get(sub.account_id);

      return {
        id: sub.id,
        accountId: sub.account_id,
        accountName: acc?.name || 'Unnamed Client',
        ownerEmail: owner?.email || 'N/A',
        ownerName: owner?.full_name || 'N/A',
        planId: sub.plan_id,
        planName: p.name,
        planPrice: p.price,
        status: sub.status,
        startDate: sub.current_period_start || sub.created_at,
        expiryDate: sub.current_period_end,
        gracePeriodEnd: sub.grace_period_end,
        razorpaySubscriptionId: sub.razorpay_subscription_id,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        notes: sub.notes,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      };
    });

    if (status && status !== 'all') {
      list = list.filter((s) => s.status === status);
    }
    if (plan && plan !== 'all') {
      list = list.filter((s) => s.planId === plan);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.accountName.toLowerCase().includes(search) ||
          s.ownerEmail.toLowerCase().includes(search) ||
          s.accountId.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, subscriptions: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
    console.error('[Admin Subscriptions GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
