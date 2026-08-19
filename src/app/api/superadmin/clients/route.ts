import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin/auth';
import { getSuperAdminServiceClient } from '@/lib/superadmin/admin-client';
import { getCurrentBillingPeriod } from '@/lib/billing/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const planFilter = searchParams.get('plan') || '';
    const statusFilter = searchParams.get('status') || '';

    const supabase = getSuperAdminServiceClient();
    const currentPeriod = getCurrentBillingPeriod();

    // Fetch accounts
    const { data: accounts, error: accountsErr } = await supabase
      .from('accounts')
      .select('id, name, created_at, default_currency')
      .order('created_at', { ascending: false });

    if (accountsErr) {
      throw accountsErr;
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ clients: [], total: 0 });
    }

    const accountIds = accounts.map((a) => a.id);

    // Fetch profiles, subscriptions, whatsapp_configs, and usage records in parallel
    const [
      { data: profiles },
      { data: subscriptions },
      { data: whatsappConfigs },
      { data: usageRecords },
      { data: contactCounts },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, email, full_name, role, account_id, account_role, avatar_url, created_at')
        .in('account_id', accountIds),
      supabase
        .from('subscriptions')
        .select('id, account_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, updated_at')
        .in('account_id', accountIds),
      supabase
        .from('whatsapp_config')
        .select('id, account_id, phone_number, verified_name, is_connected, phone_number_id, created_at')
        .in('account_id', accountIds),
      supabase
        .from('usage_records')
        .select('account_id, messages_sent, messages_received, contacts_count, automation_runs')
        .in('account_id', accountIds)
        .eq('billing_period', currentPeriod),
      supabase
        .from('contacts')
        .select('account_id'),
    ]);

    // Group contacts by account
    const contactsMap = new Map<string, number>();
    (contactCounts || []).forEach((c) => {
      if (c.account_id) {
        contactsMap.set(c.account_id, (contactsMap.get(c.account_id) || 0) + 1);
      }
    });

    // Group profiles by account
    type ProfileItem = NonNullable<typeof profiles>[number];
    const profilesMap = new Map<string, ProfileItem[]>();
    (profiles || []).forEach((p) => {
      if (p.account_id) {
        const list = profilesMap.get(p.account_id) || [];
        list.push(p);
        profilesMap.set(p.account_id, list);
      }
    });

    // Group subscriptions by account
    type SubscriptionItem = NonNullable<typeof subscriptions>[number];
    const subscriptionsMap = new Map<string, SubscriptionItem>();
    (subscriptions || []).forEach((s) => {
      if (s.account_id) {
        subscriptionsMap.set(s.account_id, s);
      }
    });

    // Group whatsapp configs by account
    type WaConfigItem = NonNullable<typeof whatsappConfigs>[number];
    const waMap = new Map<string, WaConfigItem[]>();
    (whatsappConfigs || []).forEach((w) => {
      if (w.account_id) {
        const list = waMap.get(w.account_id) || [];
        list.push(w);
        waMap.set(w.account_id, list);
      }
    });

    // Group usage records by account
    type UsageItem = NonNullable<typeof usageRecords>[number];
    const usageMap = new Map<string, UsageItem>();
    (usageRecords || []).forEach((u) => {
      if (u.account_id) {
        usageMap.set(u.account_id, u);
      }
    });

    // Enrich each client
    let enrichedClients = accounts.map((acc) => {
      const accProfiles = profilesMap.get(acc.id) || [];
      const ownerProfile =
        accProfiles.find((p) => p.account_role === 'owner') ||
        accProfiles[0] ||
        null;
      const sub = subscriptionsMap.get(acc.id) || {
        id: null,
        account_id: acc.id,
        plan_id: 'free',
        status: 'active',
        current_period_start: acc.created_at,
        current_period_end: null,
        cancel_at_period_end: false,
        updated_at: acc.created_at,
      };
      const waConfigs = waMap.get(acc.id) || [];
      const usage = usageMap.get(acc.id) || {
        account_id: acc.id,
        messages_sent: 0,
        messages_received: 0,
        contacts_count: 0,
        automation_runs: 0,
      };
      const actualContactsCount = contactsMap.get(acc.id) || 0;

      return {
        id: acc.id,
        name: acc.name,
        created_at: acc.created_at,
        default_currency: acc.default_currency || 'INR',
        owner: ownerProfile
          ? {
              id: ownerProfile.id,
              userId: ownerProfile.user_id,
              email: ownerProfile.email || 'N/A',
              fullName: ownerProfile.full_name || 'Anonymous User',
              avatarUrl: ownerProfile.avatar_url,
            }
          : null,
        teamCount: accProfiles.length,
        members: accProfiles.map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.account_role,
        })),
        subscription: {
          id: sub.id,
          planId: sub.plan_id || 'free',
          status: sub.status || 'active',
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt: sub.updated_at,
        },
        whatsappConnections: waConfigs.map((w) => ({
          id: w.id,
          phoneNumber: w.phone_number,
          verifiedName: w.verified_name,
          isConnected: w.is_connected ?? true,
          phoneNumberId: w.phone_number_id,
        })),
        whatsappCount: waConfigs.length,
        usage: {
          contactsCount: actualContactsCount || usage.contacts_count || 0,
          messagesSent: usage.messages_sent || 0,
          messagesReceived: usage.messages_received || 0,
          automationRuns: usage.automation_runs || 0,
        },
      };
    });

    // Apply filtering
    if (search) {
      enrichedClients = enrichedClients.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.id.toLowerCase().includes(search) ||
          (c.owner?.email && c.owner.email.toLowerCase().includes(search)) ||
          (c.owner?.fullName && c.owner.fullName.toLowerCase().includes(search)) ||
          c.whatsappConnections.some((w) => w.phoneNumber?.includes(search))
      );
    }

    if (planFilter && planFilter !== 'all') {
      enrichedClients = enrichedClients.filter(
        (c) => c.subscription.planId === planFilter
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      enrichedClients = enrichedClients.filter(
        (c) => c.subscription.status === statusFilter
      );
    }

    return NextResponse.json({
      success: true,
      clients: enrichedClients,
      total: enrichedClients.length,
    });
  } catch (error) {
    console.error('[superadmin-clients] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client accounts' },
      { status: 500 }
    );
  }
}
