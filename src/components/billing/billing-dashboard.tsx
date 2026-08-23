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
  CreditCard,
  Zap,
  Users,
  MessageSquare,
  Radio,
  Workflow,
  Loader2,
  Calendar,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PricingCards } from './pricing-cards';

interface PaymentRecord {
  id: string;
  razorpay_payment_id: string;
  razorpay_subscription_id?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  created_at: string;
}

export function BillingDashboard() {
  const supabase = createClient();
  const { accountId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AccountEntitlementSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBillingData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);

    try {
      // 1. Fetch Entitlements & Usage
      const entSummary = await getAccountEntitlement(accountId, supabase);
      setSummary(entSummary);

      // 2. Fetch Payment Transactions
      const { data: txList } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(15);

      setPayments(txList || []);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      toast.error('Failed to load billing details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountId, supabase]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBillingData();
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');

      toast.success(data.message || 'Subscription scheduled for cancellation.');
      setCancelModalOpen(false);
      fetchBillingData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Could not cancel subscription';
      console.error('Cancel error:', err);
      toast.error(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const activePlan = summary.plan;

  // Percentage calculator
  const getPercent = (curr: number, max: number | null) => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((curr / max) * 100));
  };

  return (
    <div className="space-y-8">
      {/* Expiry / Failed Payment Notice Banner */}
      {summary.warningMessage && (
        <div
          className={cn(
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border p-4.5 shadow-sm',
            summary.isLocked
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : summary.isGracePeriod
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
          )}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground">
                {summary.isLocked
                  ? 'Account Restricted — Subscription Expired'
                  : 'Subscription Notice'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {summary.warningMessage}
              </p>
            </div>
          </div>

          <Link href="/pricing" className="shrink-0">
            <Button
              className={cn(
                'rounded-xl text-xs h-8 px-4 font-semibold shadow-sm',
                summary.isLocked
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              <Zap className="size-3.5 mr-1.5" />
              <span>Renew Now</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Main Active Plan Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-6 sm:p-8 shadow-sm">
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Plan
              </span>
              <Badge
                className={cn(
                  'capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full',
                  summary.effectiveStatus === 'active'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : summary.effectiveStatus === 'grace_period'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30'
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full mr-1.5',
                    summary.effectiveStatus === 'active'
                      ? 'bg-emerald-400 animate-pulse'
                      : summary.effectiveStatus === 'grace_period'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  )}
                />
                {summary.cancelAtPeriodEnd ? 'Cancels at Period End' : summary.effectiveStatus.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2.5">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {activePlan.name}
              </h2>
              <span className="text-2xl font-bold text-foreground">
                ₹{activePlan.price.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-muted-foreground font-medium">/ month</span>
            </div>

            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              {activePlan.description}
            </p>

            {summary.currentPeriodEnd && (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>
                    Current Cycle Ends:{' '}
                    <strong className="text-foreground font-semibold">
                      {new Date(summary.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>

                {summary.daysRemaining !== null && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    ({summary.daysRemaining > 0 ? `${summary.daysRemaining} days remaining` : 'Cycle ended'})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-border text-muted-foreground hover:bg-muted rounded-xl text-xs h-10 px-3.5"
            >
              <RefreshCw className={cn('size-3.5 mr-1.5', refreshing && 'animate-spin')} />
              <span>Refresh Status</span>
            </Button>

            <Button
              onClick={() => {
                document.getElementById('pricing-plans-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-10 px-5 shadow-lg shadow-primary/20"
            >
              <Zap className="size-3.5 mr-1.5" />
              <span>{summary.planId === 'free' ? 'Upgrade Plan' : 'Change Plan'}</span>
            </Button>

            {summary.planId !== 'free' && !summary.cancelAtPeriodEnd && (
              <Button
                variant="ghost"
                onClick={() => setCancelModalOpen(true)}
                className="text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl h-10 px-3.5"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Quota Gauges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Usage & Quotas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live quota consumption for the current billing cycle.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/60">
            Period: {new Date().toISOString().slice(0, 7)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Contacts Quota */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Users className="size-4" />
                </div>
                Contacts
              </span>
              <span className="text-xs font-bold text-foreground">
                {summary.contacts.current.toLocaleString()} /{' '}
                {summary.contacts.limit ? summary.contacts.limit.toLocaleString() : '∞ Unlimited'}
              </span>
            </div>

            {summary.contacts.limit ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      summary.contacts.isOverLimit
                        ? 'bg-red-500'
                        : getPercent(summary.contacts.current, summary.contacts.limit) > 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    )}
                    style={{ width: `${getPercent(summary.contacts.current, summary.contacts.limit)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{getPercent(summary.contacts.current, summary.contacts.limit)}% used</span>
                  <span>
                    {Math.max(0, summary.contacts.limit - summary.contacts.current).toLocaleString()} remaining
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                  Unlimited Contacts
                </Badge>
              </div>
            )}
          </div>

          {/* Monthly Messages Quota */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <MessageSquare className="size-4" />
                </div>
                Monthly Messages
              </span>
              <span className="text-xs font-bold text-foreground">
                {summary.messages.currentMonthSent.toLocaleString()} /{' '}
                {summary.messages.limit ? summary.messages.limit.toLocaleString() : '∞ Unlimited*'}
              </span>
            </div>

            {summary.messages.limit ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      summary.messages.isOverLimit ? 'bg-red-500' : 'bg-blue-500'
                    )}
                    style={{
                      width: `${getPercent(summary.messages.currentMonthSent, summary.messages.limit)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{getPercent(summary.messages.currentMonthSent, summary.messages.limit)}% used</span>
                  <span>
                    {Math.max(0, summary.messages.limit - summary.messages.currentMonthSent).toLocaleString()} msgs left
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-semibold">
                  Unlimited Sending*
                </Badge>
              </div>
            )}
          </div>

          {/* WhatsApp API Connections */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Radio className="size-4" />
                </div>
                WhatsApp API
              </span>
              <span className="text-xs font-bold text-foreground">
                {summary.connections.current} /{' '}
                {summary.connections.limit ? summary.connections.limit : '∞ Unlimited'}
              </span>
            </div>

            {summary.connections.limit ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${getPercent(summary.connections.current, summary.connections.limit)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{summary.connections.current} of {summary.connections.limit} active</span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-semibold">
                  Unlimited Numbers
                </Badge>
              </div>
            )}
          </div>

          {/* Automations */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Workflow className="size-4" />
                </div>
                Automations
              </span>
              <span className="text-xs font-bold text-foreground">
                {summary.automations.current} /{' '}
                {summary.automations.limit ? summary.automations.limit : '∞ Unlimited'}
              </span>
            </div>

            {summary.automations.limit ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${getPercent(summary.automations.current, summary.automations.limit)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{summary.automations.current} of {summary.automations.limit} active</span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-semibold">
                  Unlimited Workflows
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Plans & Instant Upgrade */}
      <div className="space-y-4 pt-2" id="pricing-plans-section">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Upgrade Plan & Capacities
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose your tier to immediately expand your contacts, monthly messages, and WhatsApp numbers via Razorpay.
          </p>
        </div>

        <PricingCards currentPlanId={summary.planId} onPlanUpgraded={fetchBillingData} />
      </div>

      {/* Payment & Invoice History */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-border/80">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Billing History & Transactions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified Razorpay payment records and renewal receipts.
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No transactions recorded yet</p>
            <p className="text-[11px]">When you upgrade or renew a subscription via Razorpay, your payment history will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30">
                  <th className="px-6 py-3 font-semibold text-muted-foreground">Payment ID</th>
                  <th className="px-5 py-3 font-semibold text-muted-foreground">Amount</th>
                  <th className="px-5 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-5 py-3 font-semibold text-muted-foreground">Method</th>
                  <th className="px-6 py-3 font-semibold text-muted-foreground text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-foreground font-medium">
                      {tx.razorpay_payment_id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        className={cn(
                          'capitalize text-[10px] font-semibold px-2 py-0.5',
                          tx.status === 'captured' || tx.status === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : tx.status === 'failed'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        )}
                      >
                        {tx.status === 'captured' ? 'Paid' : tx.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground uppercase text-[10px]">
                      {tx.payment_method || 'Razorpay'}
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground text-right">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Your subscription will remain active until the end of the current billing cycle (
              {summary.currentPeriodEnd
                ? new Date(summary.currentPeriodEnd).toLocaleDateString()
                : 'end of month'}
              ). Afterward, your account will be transitioned to the Free tier. All contacts and message history remain safe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              className="text-xs h-9 rounded-xl border-border"
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="text-xs h-9 rounded-xl"
            >
              {cancelling && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
