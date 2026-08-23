import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { AdminOverviewStats } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = getAdminSupabaseClient();

    // 1. Fetch Accounts
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, name, created_at, status');

    if (accErr) throw accErr;

    // 2. Fetch Subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, account_id, plan_id, status, current_period_end');

    // 3. Fetch Contacts Count
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true });

    // 4. Fetch WhatsApp Connections
    const { data: waConnections } = await supabase
      .from('whatsapp_connections')
      .select('id, status');

    const totalWhatsappConnections = waConnections?.length || 0;

    // 5. Fetch Messages Count
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });

    // 6. Fetch Messages Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: messagesToday } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // 7. Fetch Active Conversations
    const { count: activeConversations } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');

    // 8. Fetch Automations & Flows Counts
    const { count: activeAutomations } = await supabase
      .from('automations')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: activeFlows } = await supabase
      .from('flows')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // 8b. Fetch Website Leads / Inquiries
    const { count: totalInquiries } = await supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true });

    const { count: newInquiries } = await supabase
      .from('contact_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');

    // 9. Fetch Payments (Success, Pending, Failed) & MRR
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('amount, status, created_at');

    let monthlyRevenue = 0;
    let pendingPayments = 0;
    let failedPayments = 0;

    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // 'YYYY-MM'

    payments?.forEach((p) => {
      if (p.status === 'captured' || p.status === 'success' || p.status === 'paid') {
        if (p.created_at?.startsWith(currentMonthPrefix)) {
          monthlyRevenue += p.amount > 100000 ? Math.round(p.amount / 100) : p.amount;
        }
      } else if (p.status === 'pending' || p.status === 'created') {
        pendingPayments++;
      } else if (p.status === 'failed' || p.status === 'payment_failed') {
        failedPayments++;
      }
    });

    // 10. Calculate Client Statuses & Plan Distributions
    const totalClients = accounts?.length || 0;
    let activeClients = 0;
    let trialClients = 0;
    let expiredClients = 0;
    let suspendedClients = 0;

    const planCounts: Record<string, number> = {
      free: 0,
      pro: 0,
      business: 0,
      enterprise: 0,
    };

    const statusCounts: Record<string, number> = {
      active: 0,
      trialing: 0,
      expired: 0,
      suspended: 0,
      past_due: 0,
    };

    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let expiringSubscriptions = 0;

    const subMap = new Map<string, NonNullable<typeof subscriptions>[number]>();
    subscriptions?.forEach((s) => subMap.set(s.account_id, s));

    accounts?.forEach((acc) => {
      const sub = subMap.get(acc.id);
      const plan = sub?.plan_id || 'free';
      const status = sub?.status || acc.status || 'active';

      planCounts[plan] = (planCounts[plan] || 0) + 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === 'active') activeClients++;
      else if (status === 'trialing' || status === 'trial') trialClients++;
      else if (status === 'expired' || status === 'cancelled') expiredClients++;
      else if (status === 'suspended') suspendedClients++;

      if (sub?.current_period_end) {
        const exp = new Date(sub.current_period_end);
        if (exp > now && exp <= sevenDaysFromNow) {
          expiringSubscriptions++;
        }
      }
    });

    // 11. Fetch AI Token/Message Usage
    const { data: usageRows } = await supabase
      .from('usage_records')
      .select('automation_runs')
      .eq('billing_period', currentMonthPrefix);

    const aiUsageTotal = usageRows?.reduce((acc, r) => acc + (r.automation_runs || 0), 0) || 0;

    // 12. Fetch Recent Admin Activities
    const { data: recentActivities } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const stats: AdminOverviewStats = {
      totalClients,
      activeClients,
      trialClients,
      expiredClients,
      suspendedClients,
      totalContacts: totalContacts || 0,
      totalMessages: totalMessages || 0,
      messagesToday: messagesToday || 0,
      activeConversations: activeConversations || 0,
      whatsappConnections: totalWhatsappConnections,
      activeAutomations: activeAutomations || 0,
      activeFlows: activeFlows || 0,
      aiUsageTotal,
      monthlyRevenue,
      pendingPayments,
      failedPayments,
      expiringSubscriptions,
      totalInquiries: totalInquiries || 0,
      newInquiries: newInquiries || 0,
      planCounts,
      statusCounts,
      recentActivities: recentActivities || [],
    };

    return NextResponse.json({ success: true, stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch admin stats';
    console.error('[Admin Stats Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
