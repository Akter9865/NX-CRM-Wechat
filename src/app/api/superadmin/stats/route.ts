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
      { data: whatsappConfigs },
      { count: totalContacts },
      { data: currentUsage },
      { data: recentAuditLogs },
      { count: totalDbMessages },
    ] = await Promise.all([
      supabase.from('accounts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan_id, status, created_at, updated_at'),
      supabase.from('whatsapp_config').select('id, status, registration_error, is_archived'),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('usage_records').select('messages_sent, contacts_count, automation_runs').eq('billing_period', currentPeriod),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
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

    const activeClients = statusCounts.active || 0;
    const trialClients = statusCounts.trialing || 0;
    const paidClients =
      (planCounts.pro || 0) + (planCounts.business || 0) + (planCounts.enterprise || 0);
    const suspendedClients =
      (statusCounts.paused || 0) +
      (statusCounts.cancelled || 0) +
      (statusCounts.expired || 0) +
      (statusCounts.past_due || 0);

    const totalMessagesThisMonth = (currentUsage || []).reduce(
      (acc, u) => acc + (u.messages_sent || 0),
      0
    );
    const totalAutomationsThisMonth = (currentUsage || []).reduce(
      (acc, u) => acc + (u.automation_runs || 0),
      0
    );

    // WhatsApp infrastructure health
    const activeWhatsappConfigs = (whatsappConfigs || []).filter((w) => !w.is_archived);
    const totalWhatsappNumbers = activeWhatsappConfigs.length;
    const failedApis = activeWhatsappConfigs.filter(
      (w) => w.status === 'error' || Boolean(w.registration_error)
    ).length;
    const connectedWhatsappApis = totalWhatsappNumbers - failedApis;

    // Financial Metrics
    const mrr =
      (planCounts.pro || 0) * 499 +
      (planCounts.business || 0) * 3000 +
      (planCounts.enterprise || 0) * 8999;
    const monthlyRevenue = mrr;
    const todaysRevenue = Math.round(mrr / 30);

    // AI Messages estimation (automation & AI reply proportion)
    const aiMessages = Math.round(totalAutomationsThisMonth * 0.75 + (totalMessagesThisMonth > 0 ? totalMessagesThisMonth * 0.35 : 0));

    return NextResponse.json({
      success: true,
      stats: {
        // Client Metrics
        totalClients: totalAccounts || 0,
        activeClients,
        trialClients,
        paidClients,
        suspendedClients,
        totalUsers: totalUsers || 0,

        // Financial Metrics
        mrr,
        todaysRevenue,
        monthlyRevenue,

        // WhatsApp Infrastructure
        totalWhatsappNumbers,
        connectedWhatsappApis,
        failedApis,

        // Messaging & AI Metrics
        totalMessages: totalMessagesThisMonth || totalDbMessages || 0,
        aiMessages,
        totalLeads: totalContacts || 0,

        // Legacy / Detailed breakdowns
        totalAccounts: totalAccounts || 0,
        totalWhatsappConnections: totalWhatsappNumbers,
        totalContacts: totalContacts || 0,
        totalMessagesThisMonth,
        totalAutomationsThisMonth,
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
