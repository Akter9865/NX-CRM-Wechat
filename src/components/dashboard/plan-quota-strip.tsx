'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  getAccountEntitlement,
  type AccountEntitlementSummary,
} from '@/lib/billing/entitlements';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Users,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function PlanQuotaStrip() {
  const supabase = createClient();
  const { accountId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AccountEntitlementSummary | null>(null);

  const loadData = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await getAccountEntitlement(accountId, supabase);
      setSummary(data);
    } catch (err) {
      console.error('[plan-quota-strip] failed to load entitlement:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !summary) {
    return (
      <div className="w-full h-20 rounded-2xl border border-border/70 bg-card/60 animate-pulse" />
    );
  }

  const { plan, planId, currentPeriodEnd, daysRemaining, contacts, messages, automations } = summary;
  const isFree = planId === 'free';
  const isOverLimit = contacts.isOverLimit || messages.isOverLimit;

  // Format Renewal or Expiry Date
  let renewalText = 'Active Free Tier';
  if (!isFree && currentPeriodEnd) {
    try {
      const formattedDate = format(new Date(currentPeriodEnd), 'dd MMM yyyy');
      renewalText = `Renews on ${formattedDate} (${daysRemaining !== null ? `${daysRemaining} days left` : 'Active'})`;
    } catch {
      renewalText = 'Active Paid Subscription';
    }
  }

  // Calculate percentages for progress bars
  const contactPct =
    contacts.limit !== null && contacts.limit > 0
      ? Math.min(100, Math.round((contacts.current / contacts.limit) * 100))
      : 5;

  const messagePct =
    messages.limit !== null && messages.limit > 0
      ? Math.min(100, Math.round((messages.currentMonthSent / messages.limit) * 100))
      : 10;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/95 to-card p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      {/* Subtle top accent highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 opacity-80" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Section: Active Plan & Renewal Date */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
            <Zap className="size-5.5 animate-pulse" />
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold tracking-tight text-foreground">
                {plan.name} Plan
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  isFree
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-primary/40 bg-primary/10 text-primary'
                )}
              >
                {isFree ? 'Free Forever' : 'Pro Subscription'}
              </Badge>
              {isOverLimit && (
                <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">
                  Limit Reached
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Calendar className="size-3.5 text-muted-foreground/80 shrink-0" />
              <span className="truncate">{renewalText}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Quota Progress Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 border-y lg:border-y-0 lg:border-x border-border/60 py-3 lg:py-0 lg:px-6">
          {/* Contacts Quota */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3 text-emerald-400" />
                Contacts
              </span>
              <span className="tabular-nums text-foreground">
                {contacts.current.toLocaleString()} / {contacts.limit !== null ? contacts.limit.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  contactPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                )}
                style={{ width: `${contacts.limit === null ? 100 : contactPct}%` }}
              />
            </div>
          </div>

          {/* Messages Quota */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3 text-blue-400" />
                Messages (Mo.)
              </span>
              <span className="tabular-nums text-foreground">
                {messages.currentMonthSent.toLocaleString()} / {messages.limit !== null ? messages.limit.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  messagePct > 90 ? 'bg-rose-500' : 'bg-blue-500'
                )}
                style={{ width: `${messages.limit === null ? 100 : messagePct}%` }}
              />
            </div>
          </div>

          {/* Automations / Workflows Quota */}
          <div className="hidden sm:block space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-amber-400" />
                Workflows
              </span>
              <span className="tabular-nums text-foreground">
                {automations.current} / {automations.limit !== null ? automations.limit : '∞'}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${automations.limit === null ? 100 : Math.min(100, (automations.current / (automations.limit || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Section: Upgrade / Manage CTA Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={isFree ? '/pricing' : '/billing'}>
            <Button
              size="sm"
              className="h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 shadow-sm gap-1.5 group"
            >
              <span>{isFree ? 'Upgrade Plan' : 'Manage Subscription'}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
