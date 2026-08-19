import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin/auth';
import { getSuperAdminServiceClient } from '@/lib/superadmin/admin-client';
import { getCurrentBillingPeriod } from '@/lib/billing/entitlements';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSuperAdminServiceClient();
    const currentPeriod = getCurrentBillingPeriod();

    const [
      { count: totalAccounts },
      { count: totalUsers },
      { data: subscriptions },
      { count: totalWhatsappConnections },
      { count: totalContacts },
      { data: currentUsage },
      { data: recentAuditLogs },
    ] = await Promise.all([
      supabase.from('accounts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan_id, status'),
      supabase.from('whatsapp_config').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('usage_records').select('messages_sent, contacts_count, automation_runs').eq('billing_period', currentPeriod),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
    ]);

    const planCounts: Record<string, number> = {
      free: 0,
      pro: 0,
      business: 0,
      enterprise: 0,
    };

    const statusCounts: Record<string, number> = {
      active: 0,
      trialing: 0,
      past_due: 0,
      paused: 0,
      cancelled: 0,
      expired: 0,
    };

    (subscriptions || []).forEach((sub) => {
      const plan = sub.plan_id || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      const st = sub.status || 'active';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const totalMessagesThisMonth = (currentUsage || []).reduce(
      (acc, u) => acc + (u.messages_sent || 0),
      0
    );
    const totalAutomationsThisMonth = (currentUsage || []).reduce(
      (acc, u) => acc + (u.automation_runs || 0),
      0
    );

    // Approximate Monthly Recurring Revenue (MRR)
    const mrr =
      (planCounts.pro || 0) * 499 +
      (planCounts.business || 0) * 3000 +
      (planCounts.enterprise || 0) * 8999;

    return NextResponse.json({
      success: true,
      stats: {
        totalAccounts: totalAccounts || 0,
        totalUsers: totalUsers || 0,
        totalWhatsappConnections: totalWhatsappConnections || 0,
        totalContacts: totalContacts || 0,
        totalMessagesThisMonth,
        totalAutomationsThisMonth,
        mrr,
        planCounts,
        statusCounts,
      },
      recentAuditLogs: recentAuditLogs || [],
    });
  } catch (error) {
    console.error('[superadmin-stats] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch superadmin statistics' },
      { status: 500 }
    );
  }
}
