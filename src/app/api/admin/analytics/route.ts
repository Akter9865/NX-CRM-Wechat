import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('view_analytics');
    const supabase = getAdminSupabaseClient();

    const [
      { data: payments },
      { data: accounts },
      { data: subscriptions },
      { data: plans },
      { data: usageRows },
    ] = await Promise.all([
      supabase.from('payment_transactions').select('amount, status, created_at').order('created_at', { ascending: true }),
      supabase.from('accounts').select('id, created_at'),
      supabase.from('subscriptions').select('plan_id, status'),
      supabase.from('plans').select('id, name, price'),
      supabase.from('usage_records').select('billing_period, messages_sent, messages_received, automation_runs'),
    ]);

    // Monthly revenue aggregation
    const monthlyRevenueMap: Record<string, number> = {};
    payments?.forEach((p) => {
      if (p.status === 'captured' || p.status === 'success' || p.status === 'paid') {
        const month = p.created_at ? p.created_at.substring(0, 7) : '2026-08';
        const amount = p.amount > 100000 ? Math.round(p.amount / 100) : p.amount;
        monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + amount;
      }
    });

    // Account growth by month
    const clientGrowthMap: Record<string, number> = {};
    accounts?.forEach((a) => {
      const month = a.created_at ? a.created_at.substring(0, 7) : '2026-08';
      clientGrowthMap[month] = (clientGrowthMap[month] || 0) + 1;
    });

    // Plan adoption
    const planAdoption: Record<string, number> = {};
    subscriptions?.forEach((s) => {
      planAdoption[s.plan_id] = (planAdoption[s.plan_id] || 0) + 1;
    });

    // Message volume by period
    const messageVolumeMap: Record<string, { sent: number; received: number; automations: number }> = {};
    usageRows?.forEach((u) => {
      const period = u.billing_period || '2026-08';
      if (!messageVolumeMap[period]) {
        messageVolumeMap[period] = { sent: 0, received: 0, automations: 0 };
      }
      messageVolumeMap[period].sent += u.messages_sent || 0;
      messageVolumeMap[period].received += u.messages_received || 0;
      messageVolumeMap[period].automations += u.automation_runs || 0;
    });

    return NextResponse.json({
      success: true,
      analytics: {
        monthlyRevenue: monthlyRevenueMap,
        clientGrowth: clientGrowthMap,
        planAdoption,
        messageVolume: messageVolumeMap,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch analytics data';
    console.error('[Admin Analytics GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
