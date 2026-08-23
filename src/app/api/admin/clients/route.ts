import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';
import { FullClientProfile } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('manage_clients');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const planFilter = searchParams.get('plan');
    const statusFilter = searchParams.get('status');

    // 1. Fetch Accounts
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, name, created_at, status, notes, settings')
      .order('created_at', { ascending: false });

    if (accErr) {
      console.error('[Admin Clients GET] Accounts query error:', accErr);
    }

    // 2. Fetch Profiles (all registered users)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, account_id, account_role, updated_at');

    if (profErr) {
      console.error('[Admin Clients GET] Profiles query error:', profErr);
    }

    // 3. Fetch Subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, account_id, plan_id, status, current_period_start, current_period_end, grace_period_end, razorpay_subscription_id');

    // 4. Fetch Plans
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name, price, contact_limit, monthly_message_limit, whatsapp_connection_limit');

    const planMap = new Map<string, NonNullable<typeof plans>[number]>();
    plans?.forEach((p) => planMap.set(p.id, p));

    // 5. Fetch WhatsApp Connections
    const { data: waConns } = await supabase
      .from('whatsapp_connections')
      .select('id, account_id, phone_number_id, display_phone_number, verified_name, status');

    // 6. Fetch Usage Records for Current Month
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const { data: usageRecords } = await supabase
      .from('usage_records')
      .select('account_id, contacts_count, messages_sent, messages_received, automation_runs')
      .eq('billing_period', currentPeriod);

    // 7. Fetch Recent Payments
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('id, account_id, razorpay_payment_id, amount, currency, status, created_at')
      .order('created_at', { ascending: false });

    // 8. Fetch Automations & Flows count
    const { data: automations } = await supabase
      .from('automations')
      .select('id, account_id');

    const { data: flows } = await supabase
      .from('flows')
      .select('id, account_id');

    // Map builders
    const ownerMap = new Map<string, NonNullable<typeof profiles>[number]>();
    const profileAccountMap = new Map<string, NonNullable<typeof profiles>[number]>();

    profiles?.forEach((prof) => {
      if (prof.account_id) {
        if (!ownerMap.has(prof.account_id) || prof.account_role === 'owner') {
          ownerMap.set(prof.account_id, prof);
        }
        profileAccountMap.set(prof.account_id, prof);
      }
    });

    const subMap = new Map<string, NonNullable<typeof subscriptions>[number]>();
    subscriptions?.forEach((s) => subMap.set(s.account_id, s));

    const usageMap = new Map<string, NonNullable<typeof usageRecords>[number]>();
    usageRecords?.forEach((u) => usageMap.set(u.account_id, u));

    // Build client list from accounts
    const clientList: FullClientProfile[] = (accounts || []).map((acc) => {
      const owner = ownerMap.get(acc.id) || profileAccountMap.get(acc.id);
      const sub = subMap.get(acc.id);
      const planId = sub?.plan_id || 'free';
      const plan = planMap.get(planId) || {
        id: planId,
        name: planId.toUpperCase(),
        price: planId === 'pro' ? 499 : planId === 'business' ? 3000 : planId === 'enterprise' ? 8999 : 0,
        contact_limit: planId === 'pro' ? 1000 : planId === 'business' ? 7000 : null,
        monthly_message_limit: null,
        whatsapp_connection_limit: planId === 'business' ? 5 : planId === 'enterprise' ? 99 : 1,
      };

      const usage = usageMap.get(acc.id);
      const accWaConns = (waConns || []).filter((w) => w.account_id === acc.id);
      const accPayments = (payments || []).filter((p) => p.account_id === acc.id);
      const accAutomationsCount = (automations || []).filter((a) => a.account_id === acc.id).length;
      const accFlowsCount = (flows || []).filter((f) => f.account_id === acc.id).length;

      return {
        id: acc.id,
        name: acc.name || owner?.full_name || 'Client Workspace',
        email: owner?.email || 'N/A',
        phone: accWaConns[0]?.display_phone_number || null,
        company: acc.name,
        createdAt: acc.created_at,
        status: (sub?.status as FullClientProfile['status']) || (acc.status as FullClientProfile['status']) || 'active',
        notes: acc.notes || null,
        currentPlan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          contactLimit: plan.contact_limit,
          monthlyMessageLimit: plan.monthly_message_limit,
          whatsappLimit: plan.whatsapp_connection_limit,
        },
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              startDate: sub.current_period_start || acc.created_at,
              expiryDate: sub.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
              gracePeriodEnd: sub.grace_period_end,
              razorpaySubscriptionId: sub.razorpay_subscription_id,
            }
          : null,
        usage: {
          contactsCount: usage?.contacts_count || 0,
          messagesSentThisMonth: usage?.messages_sent || 0,
          messagesReceivedThisMonth: usage?.messages_received || 0,
          automationRunsThisMonth: usage?.automation_runs || 0,
          whatsappConnectionsCount: accWaConns.length,
          teamMembersCount: (profiles || []).filter((p) => p.account_id === acc.id).length || 1,
          automationsCount: accAutomationsCount,
          flowsCount: accFlowsCount,
          aiKnowledgeCount: 0,
        },
        lastActiveAt: owner?.updated_at || acc.created_at,
        whatsappConnections: accWaConns.map((w) => ({
          id: w.id,
          phoneNumberId: w.phone_number_id,
          displayPhoneNumber: w.display_phone_number,
          verifiedName: w.verified_name,
          status: w.status,
        })),
        recentPayments: accPayments.map((p) => ({
          id: p.id,
          razorpayPaymentId: p.razorpay_payment_id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.created_at,
        })),
      };
    });

    // Also include any registered profiles that do not yet have an account record
    const knownAccountIds = new Set((accounts || []).map((a) => a.id));
    const unlinkedProfiles = (profiles || []).filter(
      (p) => !p.account_id || !knownAccountIds.has(p.account_id)
    );

    unlinkedProfiles.forEach((prof) => {
      const clientId = prof.account_id || prof.id;
      clientList.push({
        id: clientId,
        name: prof.full_name || 'Registered User',
        email: prof.email,
        phone: null,
        company: prof.full_name || 'Personal Account',
        createdAt: prof.updated_at || new Date().toISOString(),
        status: 'active',
        notes: 'Direct Profile Registration',
        currentPlan: {
          id: 'free',
          name: 'FREE',
          price: 0,
          contactLimit: 250,
          monthlyMessageLimit: 1000,
          whatsappLimit: 1,
        },
        subscription: null,
        usage: {
          contactsCount: 0,
          messagesSentThisMonth: 0,
          messagesReceivedThisMonth: 0,
          automationRunsThisMonth: 0,
          whatsappConnectionsCount: 0,
          teamMembersCount: 1,
          automationsCount: 0,
          flowsCount: 0,
          aiKnowledgeCount: 0,
        },
        lastActiveAt: prof.updated_at || new Date().toISOString(),
        whatsappConnections: [],
        recentPayments: [],
      });
    });

    // Apply filtering
    let filtered = clientList;
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          (c.company && c.company.toLowerCase().includes(search)) ||
          c.id.toLowerCase().includes(search)
      );
    }
    if (planFilter && planFilter !== 'all') {
      filtered = filtered.filter((c) => c.currentPlan.id === planFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    return NextResponse.json({ success: true, clients: filtered });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch clients';
    console.error('[Admin Clients GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_clients');
    const supabase = getAdminSupabaseClient();
    const { name, email, planId, notes } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Client name and email are required' },
        { status: 400 }
      );
    }

    // 1. Create account
    const { data: newAccount, error: accErr } = await supabase
      .from('accounts')
      .insert({
        name,
        notes: notes || null,
        status: 'active',
      })
      .select('*')
      .single();

    if (accErr) throw accErr;

    // 2. Create subscription
    const assignedPlan = planId || 'free';
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('subscriptions').insert({
      account_id: newAccount.id,
      plan_id: assignedPlan,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: currentPeriodEnd,
    });

    // 3. Log audit
    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'client.create',
      targetType: 'account',
      targetId: newAccount.id,
      details: { name, email, planId: assignedPlan },
    });

    return NextResponse.json({ success: true, account: newAccount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create client';
    console.error('[Admin Client POST Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
