/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient as createServerSupabase, SupabaseClient } from '@supabase/supabase-js';
import { PLANS, type PlanConfig, type PlanId } from './plans';
import { format } from 'date-fns';

function getServiceSupabase(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';
  return createServerSupabase(url, key);
}

/** Configurable grace period in days (default 0 days per product specification) */
export function getGracePeriodDays(): number {
  const raw = process.env.BILLING_GRACE_PERIOD_DAYS || process.env.NEXT_PUBLIC_BILLING_GRACE_PERIOD_DAYS;
  const parsed = parseInt(raw || '0', 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function getCurrentBillingPeriod(): string {
  return format(new Date(), 'yyyy-MM');
}

export interface SubscriptionStatusInfo {
  isActive: boolean;
  isExpired: boolean;
  isLocked: boolean;
  isGracePeriod: boolean;
  status: string; // 'active' | 'past_due' | 'payment_failed' | 'cancelled' | 'expired' | 'paused'
  effectiveStatus: 'active' | 'grace_period' | 'locked' | 'expired' | 'cancelled';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planId: PlanId;
  plan: PlanConfig;
  daysRemaining: number | null;
  warningMessage?: string;
}

export interface AccountEntitlementSummary extends SubscriptionStatusInfo {
  contacts: {
    current: number;
    limit: number | null;
    isOverLimit: boolean;
  };
  messages: {
    currentMonthSent: number;
    limit: number | null;
    isOverLimit: boolean;
  };
  connections: {
    current: number;
    limit: number | null;
    isOverLimit: boolean;
  };
  automations: {
    current: number;
    limit: number | null;
    isOverLimit: boolean;
  };
}

/**
 * Authoritative evaluation of a subscription row's validity.
 */
export function evaluateSubscriptionStatus(
  sub: {
    plan_id?: string | null;
    status?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean | null;
  } | null,
): SubscriptionStatusInfo {
  const planId: PlanId = (sub?.plan_id as PlanId) || 'free';
  const plan = PLANS[planId] || PLANS.free;
  const dbStatus = (sub?.status || 'active').toLowerCase();
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);
  const periodEndStr = sub?.current_period_end || null;

  // Free plan is always active unless explicitly suspended
  if (planId === 'free') {
    return {
      isActive: true,
      isExpired: false,
      isLocked: false,
      isGracePeriod: false,
      status: dbStatus,
      effectiveStatus: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      planId: 'free',
      plan,
      daysRemaining: null,
    };
  }

  // For paid plans, evaluate expiration date and grace period
  const now = new Date();
  const graceDays = getGracePeriodDays();
  const graceMs = graceDays * 24 * 60 * 60 * 1000;

  let periodEndDate: Date | null = null;
  let daysRemaining: number | null = null;

  if (periodEndStr) {
    const parsedDate = new Date(periodEndStr);
    if (!Number.isNaN(parsedDate.getTime())) {
      periodEndDate = parsedDate;
      const diffMs = periodEndDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    }
  }

  // Explicitly cancelled / terminated subscriptions
  if (dbStatus === 'cancelled' || dbStatus === 'canceled') {
    // If cancelled but still within the active billing cycle
    if (periodEndDate && now.getTime() <= periodEndDate.getTime()) {
      return {
        isActive: true,
        isExpired: false,
        isLocked: false,
        isGracePeriod: false,
        status: 'cancelled',
        effectiveStatus: 'cancelled',
        currentPeriodEnd: periodEndStr,
        cancelAtPeriodEnd: true,
        planId,
        plan,
        daysRemaining: Math.max(0, daysRemaining ?? 0),
        warningMessage: `Your subscription is scheduled to cancel at the end of the billing period (${daysRemaining} days remaining).`,
      };
    }

    // Cancelled and period has ended -> Locked
    return {
      isActive: false,
      isExpired: true,
      isLocked: true,
      isGracePeriod: false,
      status: 'cancelled',
      effectiveStatus: 'locked',
      currentPeriodEnd: periodEndStr,
      cancelAtPeriodEnd: true,
      planId,
      plan,
      daysRemaining: 0,
      warningMessage: 'Your subscription has been cancelled and expired. Please renew to continue using paid features.',
    };
  }

  // Suspended or paused
  if (dbStatus === 'paused' || dbStatus === 'suspended') {
    return {
      isActive: false,
      isExpired: true,
      isLocked: true,
      isGracePeriod: false,
      status: dbStatus,
      effectiveStatus: 'locked',
      currentPeriodEnd: periodEndStr,
      cancelAtPeriodEnd,
      planId,
      plan,
      daysRemaining: 0,
      warningMessage: 'Your account is suspended. Please contact support or update your billing details.',
    };
  }

  // Check date expiration for active or past_due statuses
  if (periodEndDate) {
    const endMs = periodEndDate.getTime();
    const nowMs = now.getTime();

    // Still within active validity period
    if (nowMs <= endMs) {
      const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
      return {
        isActive: true,
        isExpired: false,
        isLocked: false,
        isGracePeriod: false,
        status: dbStatus,
        effectiveStatus: 'active',
        currentPeriodEnd: periodEndStr,
        cancelAtPeriodEnd,
        planId,
        plan,
        daysRemaining,
        warningMessage: isExpiringSoon
          ? `Your subscription renews in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
          : undefined,
      };
    }

    // Passed period end: check if within grace period
    const graceExpiryMs = endMs + graceMs;
    if (nowMs <= graceExpiryMs && graceDays > 0) {
      const graceDaysRemaining = Math.max(1, Math.ceil((graceExpiryMs - nowMs) / (24 * 60 * 60 * 1000)));
      return {
        isActive: true,
        isExpired: true,
        isLocked: false,
        isGracePeriod: true,
        status: dbStatus,
        effectiveStatus: 'grace_period',
        currentPeriodEnd: periodEndStr,
        cancelAtPeriodEnd,
        planId,
        plan,
        daysRemaining: 0,
        warningMessage: `Payment past due. Your grace period ends in ${graceDaysRemaining} day${graceDaysRemaining === 1 ? '' : 's'}. Please renew to prevent service interruption.`,
      };
    }

    // Past both period end and grace period -> Fully Locked
    return {
      isActive: false,
      isExpired: true,
      isLocked: true,
      isGracePeriod: false,
      status: dbStatus === 'active' ? 'expired' : dbStatus,
      effectiveStatus: 'locked',
      currentPeriodEnd: periodEndStr,
      cancelAtPeriodEnd,
      planId,
      plan,
      daysRemaining: 0,
      warningMessage: 'Your subscription has expired. Access to sending messages, adding contacts, and automations is locked until renewed.',
    };
  }

  // If no date is set on a paid plan, treat as locked for safety unless status is 'active'
  if (dbStatus === 'active') {
    return {
      isActive: true,
      isExpired: false,
      isLocked: false,
      isGracePeriod: false,
      status: 'active',
      effectiveStatus: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      planId,
      plan,
      daysRemaining: null,
    };
  }

  // Default fallback
  return {
    isActive: true,
    isExpired: false,
    isLocked: false,
    isGracePeriod: false,
    status: dbStatus,
    effectiveStatus: 'active',
    currentPeriodEnd: periodEndStr,
    cancelAtPeriodEnd,
    planId,
    plan,
    daysRemaining,
  };
}

async function safeMaybeSingle(query: any): Promise<any> {
  try {
    if (!query) return null;
    if (typeof query.maybeSingle === 'function') {
      const res = await query.maybeSingle();
      return res?.data ?? null;
    }
    if (typeof query.single === 'function') {
      const res = await query.single();
      return res?.data ?? null;
    }
    if (typeof query.then === 'function') {
      const res = await query;
      return Array.isArray(res?.data) ? res.data[0] : res?.data ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function safeCount(query: any): Promise<number> {
  try {
    if (!query) return 0;
    if (typeof query.then === 'function') {
      const res = await query;
      return typeof res?.count === 'number' ? res.count : (Array.isArray(res?.data) ? res.data.length : 0);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Check if the account has an active, valid subscription.
 */
export async function isSubscriptionActive(
  accountId: string,
  client?: any,
): Promise<SubscriptionStatusInfo> {
  try {
    const sb = client || getServiceSupabase();
    const sub = await safeMaybeSingle(
      sb.from('subscriptions').select('plan_id, status, current_period_end, cancel_at_period_end').eq('account_id', accountId)
    );
    return evaluateSubscriptionStatus(sub);
  } catch {
    return evaluateSubscriptionStatus(null);
  }
}

/**
 * Get the full entitlement and usage summary for an account.
 */
export async function getAccountEntitlement(
  accountId: string,
  client?: any,
): Promise<AccountEntitlementSummary> {
  try {
    const sb = client || getServiceSupabase();
    const period = getCurrentBillingPeriod();

    const sub = await safeMaybeSingle(
      sb.from('subscriptions').select('plan_id, status, current_period_end, cancel_at_period_end').eq('account_id', accountId)
    );
    const statusInfo = evaluateSubscriptionStatus(sub);
    const plan = statusInfo.plan;

    let currentContacts = 0;
    try {
      const q = sb.from?.('contacts')?.select?.('id', { count: 'exact', head: true })?.eq?.('account_id', accountId);
      currentContacts = await safeCount(q);
    } catch {}

    let currentMessages = 0;
    try {
      const q = sb.from?.('usage_records')?.select?.('messages_sent, messages_received')?.eq?.('account_id', accountId)?.eq?.('billing_period', period);
      const usage = await safeMaybeSingle(q);
      currentMessages = usage?.messages_sent ?? 0;
    } catch {}

    let currentConnections = 0;
    try {
      let q = sb.from?.('whatsapp_config')?.select?.('id', { count: 'exact', head: true })?.eq?.('account_id', accountId);
      if (q && typeof q.eq === 'function') {
        const withArchived = q.eq('is_archived', false);
        if (withArchived) q = withArchived;
      }
      currentConnections = await safeCount(q);
    } catch {}

    let currentAutomations = 0;
    try {
      const q = sb.from?.('automations')?.select?.('id', { count: 'exact', head: true })?.eq?.('account_id', accountId);
      currentAutomations = await safeCount(q);
    } catch {}

    const automationLimit = statusInfo.planId === 'free' ? 3 : null;

    return {
      ...statusInfo,
      contacts: {
        current: currentContacts,
        limit: plan.contactLimit,
        isOverLimit: plan.contactLimit !== null && currentContacts >= plan.contactLimit,
      },
      messages: {
        currentMonthSent: currentMessages,
        limit: plan.monthlyMessageLimit,
        isOverLimit: plan.monthlyMessageLimit !== null && currentMessages >= plan.monthlyMessageLimit,
      },
      connections: {
        current: currentConnections,
        limit: plan.whatsappConnectionLimit,
        isOverLimit: plan.whatsappConnectionLimit !== null && currentConnections >= plan.whatsappConnectionLimit,
      },
      automations: {
        current: currentAutomations,
        limit: automationLimit,
        isOverLimit: automationLimit !== null && currentAutomations >= automationLimit,
      },
    };
  } catch {
    const fallbackStatus = evaluateSubscriptionStatus(null);
    return {
      ...fallbackStatus,
      contacts: { current: 0, limit: 10, isOverLimit: false },
      messages: { currentMonthSent: 0, limit: 200, isOverLimit: false },
      connections: { current: 0, limit: 1, isOverLimit: false },
      automations: { current: 0, limit: 3, isOverLimit: false },
    };
  }
}

/**
 * Backend guard: check if adding a new contact is allowed under the account plan.
 */
export async function checkCanAddContact(
  accountId: string,
  countToAddOrClient?: number | any,
  clientParam?: any,
): Promise<{ allowed: boolean; locked?: boolean; message?: string; plan: PlanConfig; current: number; limit: number | null }> {
  const countToAdd = typeof countToAddOrClient === 'number' ? countToAddOrClient : 1;
  const client = typeof countToAddOrClient === 'object' && countToAddOrClient !== null ? countToAddOrClient : clientParam;
  const summary = await getAccountEntitlement(accountId, client);

  if (summary.isLocked) {
    return {
      allowed: false,
      locked: true,
      message: 'Your subscription has expired. Please renew your plan to add contacts.',
      plan: summary.plan,
      current: summary.contacts.current,
      limit: summary.contacts.limit,
    };
  }

  if (summary.contacts.limit !== null && summary.contacts.current + countToAdd > summary.contacts.limit) {
    return {
      allowed: false,
      message: `Contact limit reached. Your ${summary.plan.name} plan supports up to ${summary.contacts.limit.toLocaleString()} contacts. Upgrade your plan to add more contacts.`,
      plan: summary.plan,
      current: summary.contacts.current,
      limit: summary.contacts.limit,
    };
  }

  return {
    allowed: true,
    plan: summary.plan,
    current: summary.contacts.current,
    limit: summary.contacts.limit,
  };
}

/**
 * Backend guard: check if sending a message is allowed under the monthly plan message limit.
 */
export async function checkCanSendMessage(
  accountId: string,
  countToSendOrClient?: number | any,
  clientParam?: any,
): Promise<{ allowed: boolean; locked?: boolean; message?: string; plan: PlanConfig; currentSent: number; limit: number | null }> {
  const countToSend = typeof countToSendOrClient === 'number' ? countToSendOrClient : 1;
  const client = typeof countToSendOrClient === 'object' && countToSendOrClient !== null ? countToSendOrClient : clientParam;
  const summary = await getAccountEntitlement(accountId, client);

  if (summary.isLocked) {
    return {
      allowed: false,
      locked: true,
      message: 'Your subscription has expired. Please renew your plan to send WhatsApp messages.',
      plan: summary.plan,
      currentSent: summary.messages.currentMonthSent,
      limit: summary.messages.limit,
    };
  }

  if (summary.messages.limit !== null && summary.messages.currentMonthSent + countToSend > summary.messages.limit) {
    return {
      allowed: false,
      message: `Monthly message limit reached (${summary.messages.limit.toLocaleString()} msgs). Upgrade to Pro or Business to continue messaging.`,
      plan: summary.plan,
      currentSent: summary.messages.currentMonthSent,
      limit: summary.messages.limit,
    };
  }

  return {
    allowed: true,
    plan: summary.plan,
    currentSent: summary.messages.currentMonthSent,
    limit: summary.messages.limit,
  };
}

/**
 * Backend guard: check if adding a new WhatsApp connection is allowed under the account plan.
 */
export async function checkCanAddConnection(
  accountId: string,
  client?: any,
): Promise<{ allowed: boolean; locked?: boolean; message?: string; plan: PlanConfig; current: number; limit: number | null }> {
  const summary = await getAccountEntitlement(accountId, client);

  if (summary.isLocked) {
    return {
      allowed: false,
      locked: true,
      message: 'Your subscription has expired. Please renew your plan to connect WhatsApp numbers.',
      plan: summary.plan,
      current: summary.connections.current,
      limit: summary.connections.limit,
    };
  }

  if (summary.connections.limit !== null && summary.connections.current >= summary.connections.limit) {
    return {
      allowed: false,
      message: `WhatsApp connection limit reached (${summary.connections.limit}). Your ${summary.plan.name} plan supports up to ${summary.connections.limit} active WhatsApp API connection(s). Upgrade to Business or Enterprise to connect more phone numbers.`,
      plan: summary.plan,
      current: summary.connections.current,
      limit: summary.connections.limit,
    };
  }

  return {
    allowed: true,
    plan: summary.plan,
    current: summary.connections.current,
    limit: summary.connections.limit,
  };
}

/**
 * Backend guard: check if creating a new automation is allowed under the account plan.
 */
export async function checkCanCreateAutomation(
  accountId: string,
  client?: any,
): Promise<{ allowed: boolean; locked?: boolean; message?: string; plan: PlanConfig; current: number; limit: number | null }> {
  const summary = await getAccountEntitlement(accountId, client);

  if (summary.isLocked) {
    return {
      allowed: false,
      locked: true,
      message: 'Your subscription has expired. Please renew your plan to create automation workflows.',
      plan: summary.plan,
      current: summary.automations.current,
      limit: summary.automations.limit,
    };
  }

  if (summary.automations.limit !== null && summary.automations.current >= summary.automations.limit) {
    return {
      allowed: false,
      message: `Automation limit reached. The Free plan allows up to 3 active automation workflows. Upgrade to Pro for unlimited automations.`,
      plan: summary.plan,
      current: summary.automations.current,
      limit: summary.automations.limit,
    };
  }

  return {
    allowed: true,
    plan: summary.plan,
    current: summary.automations.current,
    limit: summary.automations.limit,
  };
}

/**
 * Backend guard: check if automation execution is permitted.
 */
export async function checkCanExecuteAutomation(
  accountId: string,
  client?: any,
): Promise<{ allowed: boolean; locked?: boolean; reason?: string }> {
  const statusInfo = await isSubscriptionActive(accountId, client);

  if (statusInfo.isLocked) {
    return {
      allowed: false,
      locked: true,
      reason: 'Automation paused because your subscription is inactive.',
    };
  }

  return { allowed: true };
}

/**
 * Backend guard: check if a specific feature key is allowed for the account.
 */
export async function canUseFeature(
  accountId: string,
  featureKey: string,
  client?: any,
): Promise<{ allowed: boolean; locked?: boolean; message?: string }> {
  const summary = await getAccountEntitlement(accountId, client);

  if (summary.isLocked) {
    return {
      allowed: false,
      locked: true,
      message: 'Your subscription has expired. Please renew your plan to access this feature.',
    };
  }

  const sb = client || getServiceSupabase();
  const { data: feature } = await sb
    .from('plan_features')
    .select('enabled')
    .eq('plan_id', summary.planId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  if (feature && !feature.enabled) {
    return {
      allowed: false,
      message: `Feature '${featureKey}' is not included in your ${summary.plan.name} plan. Upgrade to access this feature.`,
    };
  }

  return { allowed: true };
}

/**
 * Track an outbound message in the account's monthly usage record.
 */
export async function trackOutboundMessage(
  accountId: string,
  count = 1,
  client?: any,
): Promise<void> {
  try {
    const sb = client || getServiceSupabase();
    const period = getCurrentBillingPeriod();

    // Fetch current usage or insert
    const existing = await safeMaybeSingle(
      sb.from('usage_records').select('id, messages_sent').eq('account_id', accountId).eq('billing_period', period)
    );

    if (existing?.id) {
      await sb
        .from('usage_records')
        .update({
          messages_sent: (existing.messages_sent || 0) + count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await sb.from('usage_records').insert({
        account_id: accountId,
        billing_period: period,
        messages_sent: count,
        messages_received: 0,
      });
    }
  } catch (err) {
    // Non-fatal usage tracking
    console.warn('[trackOutboundMessage] failed to record message usage:', err);
  }
}

/**
 * Backend guard: check if contact deletion is permitted for the account.
 * Contact deletion is restricted exclusively to Business and Enterprise plans.
 */
export async function checkCanDeleteContacts(
  accountId: string,
  client?: any
): Promise<{ allowed: boolean; planId: PlanId; message?: string }> {
  const statusInfo = await isSubscriptionActive(accountId, client);

  if (statusInfo.isLocked) {
    return {
      allowed: false,
      planId: statusInfo.planId,
      message: 'Account subscription is inactive or locked.',
    };
  }

  // Only Business (₹3,000/mo) and Enterprise (₹8,999/mo) plans permit contact deletion
  const allowed = statusInfo.planId === 'business' || statusInfo.planId === 'enterprise';

  if (!allowed) {
    return {
      allowed: false,
      planId: statusInfo.planId,
      message: 'Contact deletion is only available on Business and Enterprise plans. Please upgrade your plan to delete contacts.',
    };
  }

  return {
    allowed: true,
    planId: statusInfo.planId,
  };
}
