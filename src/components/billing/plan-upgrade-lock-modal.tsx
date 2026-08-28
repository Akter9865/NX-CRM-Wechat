'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  Zap,
  ArrowRight,
  Users,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AccountEntitlementSummary } from '@/lib/billing/entitlements';
import { PLANS, type PlanConfig } from '@/lib/billing/plans';

interface PlanUpgradeLockModalProps {
  summary: AccountEntitlementSummary | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRenewSuccess?: () => void;
}

export function PlanUpgradeLockModal({
  summary,
  isOpen: controlledIsOpen,
  onOpenChange: setControlledIsOpen,
}: PlanUpgradeLockModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOverLimit = Boolean(
    summary &&
      (summary.contacts.isOverLimit ||
        summary.messages.isOverLimit ||
        summary.isLocked ||
        summary.isExpired)
  );

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalIsOpen(controlledIsOpen);
    } else if (isOverLimit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalIsOpen(true);
    }
  }, [controlledIsOpen, isOverLimit]);

  const handleOpenChange = (open: boolean) => {
    setInternalIsOpen(open);
    setControlledIsOpen?.(open);
  };

  if (!summary) return null;

  const currentPlanId = summary.planId || 'free';
  const isContactsOver = summary.contacts.isOverLimit;
  const isMessagesOver = summary.messages.isOverLimit;
  const isExpired = summary.isLocked || summary.isExpired;

  // Determine title and explanation
  let lockTitle = 'Plan Limit Reached';
  let lockSubtitle = `Your ${summary.plan.name} plan quota has been reached. Upgrade to the next plan to continue messaging and adding contacts seamlessly.`;

  if (isContactsOver) {
    lockTitle = 'Contact Capacity Limit Reached';
    lockSubtitle = `You have reached the maximum contact capacity (${summary.contacts.current.toLocaleString()} / ${summary.contacts.limit?.toLocaleString()} contacts) on the ${summary.plan.name} plan. Upgrade to unlock more contacts.`;
  } else if (isMessagesOver) {
    lockTitle = 'Monthly Message Limit Reached';
    lockSubtitle = `You have reached your monthly message bandwidth (${summary.messages.currentMonthSent.toLocaleString()} / ${summary.messages.limit?.toLocaleString()} messages). Upgrade for unlimited messaging.`;
  } else if (isExpired) {
    lockTitle = 'Subscription Inactive or Expired';
    lockSubtitle = `Your ${summary.plan.name} subscription period has ended. Renew or upgrade your plan to restore full CRM and messaging capabilities.`;
  }

  // Calculate Next Recommended Tier
  let recommendedPlan: PlanConfig = PLANS.pro;
  let nextTierNote = '700 Contacts • Unlimited Messages • AI Assist';

  if (currentPlanId === 'free') {
    recommendedPlan = PLANS.pro;
    nextTierNote = '700 Contacts • Unlimited Messages • AI Auto-Reply';
  } else if (currentPlanId === 'pro') {
    recommendedPlan = PLANS.business;
    nextTierNote = '7,000 Contacts • 5 WhatsApp Connections • Broadcasts';
  } else if (currentPlanId === 'business') {
    recommendedPlan = PLANS.enterprise;
    nextTierNote = 'Unlimited Contacts • Unlimited WhatsApp Numbers • SLA';
  }

  return (
    <Dialog open={internalIsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-3xl border-primary/20 bg-background p-6 sm:p-8 max-w-lg shadow-2xl">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-inner">
            <Lock className="size-7 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                {lockTitle}
              </DialogTitle>
              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                Upgrade Required
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {lockSubtitle}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Current Usage Status Quota Box */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold">
              <Users className="size-3.5 text-blue-400" />
              <span>Contacts</span>
            </div>
            <p className="mt-1 font-bold text-foreground text-sm">
              {summary.contacts.current.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {summary.contacts.limit !== null ? summary.contacts.limit.toLocaleString() : '∞'}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold">
              <MessageSquare className="size-3.5 text-emerald-400" />
              <span>Messages</span>
            </div>
            <p className="mt-1 font-bold text-foreground text-sm">
              {summary.messages.currentMonthSent.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {summary.messages.limit !== null ? summary.messages.limit.toLocaleString() : '∞'}
              </span>
            </p>
          </div>
        </div>

        {/* Recommended Upgrade Tier Card */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <span className="font-bold text-foreground text-sm">
                Recommended: {recommendedPlan.name} Plan
              </span>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              ₹{recommendedPlan.price.toLocaleString('en-IN')} / mo
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {nextTierNote}
          </p>

          <Link href={`/billing?upgrade=${recommendedPlan.id}`} className="block w-full">
            <Button className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2">
              <Zap className="size-3.5" />
              <span>Upgrade to {recommendedPlan.name} (Instant Activation)</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {/* Data Protection Guarantee */}
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <span>All contacts, chats, WhatsApp credentials, and flows remain 100% safe.</span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <Link href="/billing" className="w-full sm:w-auto flex-1">
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl border-border text-foreground hover:bg-muted text-xs font-semibold"
            >
              <CreditCard className="size-3.5 mr-1.5 text-muted-foreground" />
              <span>Manage Billing</span>
            </Button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto flex-1">
            <Button
              variant="secondary"
              className="w-full h-9 rounded-xl text-xs font-bold"
            >
              <span>View All Plans</span>
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
