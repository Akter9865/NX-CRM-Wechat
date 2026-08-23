'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  CreditCard,
  MessageSquare,
  Users,
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
import type { SubscriptionStatusInfo } from '@/lib/billing/entitlements';

interface PlanExpiryModalProps {
  statusInfo: SubscriptionStatusInfo | null;
  onRenewSuccess?: () => void;
}

export function PlanExpiryModal({ statusInfo, onRenewSuccess }: PlanExpiryModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (statusInfo && (statusInfo.isLocked || statusInfo.isExpired)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [statusInfo]);

  if (!statusInfo || (!statusInfo.isLocked && !statusInfo.isExpired)) {
    return null;
  }

  const expiryDateFormatted = statusInfo.currentPeriodEnd
    ? new Date(statusInfo.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DialogContent className="rounded-3xl border-red-200 bg-white p-6 sm:p-8 max-w-lg shadow-2xl">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600 shadow-inner">
            <Lock className="size-7 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <DialogTitle className="text-2xl font-extrabold text-slate-900">
                Subscription Expired
              </DialogTitle>
              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                {statusInfo.status.replace('_', ' ')}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Your <strong className="text-slate-900 uppercase font-bold">{statusInfo.planId}</strong> plan expired on{' '}
              <span className="font-semibold text-slate-900">{expiryDateFormatted}</span>. Renew or upgrade your plan to unlock full dashboard & CRM messaging access.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Benefits preserved box */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Your Data is 100% Safe</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            All stored contacts, chat histories, Meta WhatsApp connections, and visual automation flows are safely preserved. Upgrading will restore immediate real-time messaging access.
          </p>
        </div>

        {/* Quick Upgrade Plans */}
        <div className="space-y-2.5 pt-1">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">Pro Plan</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ₹499 / mo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">1,000 Contacts • Unlimited Messages • AI Assist</p>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm">
                Upgrade Pro
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">Business Plan</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  ₹3,000 / mo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">7,000 Contacts • Broadcast Engine • 5 WA Numbers</p>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm">
                Upgrade Business
              </Button>
            </Link>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <Link href="/billing" className="w-full sm:w-auto flex-1">
            <Button variant="outline" className="w-full h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold">
              <CreditCard className="size-3.5 mr-1.5 text-slate-500" />
              <span>Billing History</span>
            </Button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto flex-1">
            <Button className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md">
              <Zap className="size-3.5 mr-1.5 text-amber-400" />
              <span>View All Plans</span>
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
