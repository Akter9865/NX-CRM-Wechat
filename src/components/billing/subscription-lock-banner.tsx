'use client';

import Link from 'next/link';
import { AlertTriangle, Zap, ArrowRight, ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionStatusInfo } from '@/lib/billing/entitlements';

interface SubscriptionLockBannerProps {
  statusInfo: SubscriptionStatusInfo;
  onRenewClick?: () => void;
}

export function SubscriptionLockBanner({ statusInfo, onRenewClick }: SubscriptionLockBannerProps) {
  if (!statusInfo.isLocked && !statusInfo.warningMessage && !statusInfo.isGracePeriod) {
    return null;
  }

  const isExpiredOrFailed = statusInfo.isLocked;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-card p-4 sm:p-5 shadow-lg shadow-red-500/5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
            {isExpiredOrFailed ? (
              <ShieldAlert className="size-5" />
            ) : (
              <AlertTriangle className="size-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                {isExpiredOrFailed
                  ? 'Subscription Expired — CRM Features Restricted'
                  : 'Subscription Notice'}
              </h4>
              <Badge
                variant="destructive"
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
              >
                {statusInfo.status.replace('_', ' ')}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {statusInfo.warningMessage ||
                'Your subscription is no longer active. To continue sending WhatsApp messages, managing contacts, and running automations, please renew your plan.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
          <Link href="/pricing">
            <Button
              onClick={onRenewClick}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs h-9 px-4 shadow-md shadow-red-600/20"
            >
              <Zap className="size-3.5 mr-1.5" />
              <span>Renew Plan</span>
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>

          <Link href="/billing">
            <Button
              variant="outline"
              className="border-red-500/30 hover:bg-red-500/10 text-xs h-9 rounded-xl text-foreground"
            >
              <CreditCard className="size-3.5 mr-1.5 text-muted-foreground" />
              <span>Billing Settings</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
