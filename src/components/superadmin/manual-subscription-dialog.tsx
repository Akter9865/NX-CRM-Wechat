'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  Zap,
  Building2,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ClientData {
  id: string;
  name: string;
  created_at: string;
  owner?: {
    email: string;
    fullName: string;
  } | null;
  subscription: {
    planId: string;
    status: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  };
  whatsappCount: number;
  usage: {
    contactsCount: number;
    messagesSent: number;
    automationRuns: number;
  };
}

interface ManualSubscriptionDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManualSubscriptionDialog({
  client,
  open,
  onOpenChange,
  onSuccess,
}: ManualSubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      const plan = (client.subscription.planId as PlanId) || 'free';
      setSelectedPlan(plan);
      setSelectedStatus(client.subscription.status || 'active');
      setReason('');

      if (client.subscription.currentPeriodEnd) {
        const d = new Date(client.subscription.currentPeriodEnd);
        if (!isNaN(d.getTime())) {
          setExpiryDate(d.toISOString().split('T')[0]);
        } else {
          setExpiryDate(getDefaultDate(30));
        }
      } else {
        setExpiryDate(getDefaultDate(30));
      }
    }
  }, [client]);

  function getDefaultDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }

  function handleQuickExtend(days: number) {
    if (days === 36500) {
      // Lifetime / Year 2099
      setExpiryDate('2099-12-31');
    } else {
      setExpiryDate(getDefaultDate(days));
    }
  }

  async function handleSave() {
    if (!client) return;
    setLoading(true);

    try {
      const isoPeriodEnd = expiryDate
        ? new Date(`${expiryDate}T23:59:59Z`).toISOString()
        : null;

      const res = await fetch(`/api/superadmin/clients/${client.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan,
          status: selectedStatus,
          current_period_end: isoPeriodEnd,
          cancel_at_period_end: selectedStatus === 'cancelled',
          reason: reason.trim() || 'Manual SuperAdmin override',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      toast.success(
        `Subscription updated: ${client.name} is now on ${PLANS[selectedPlan]?.name || selectedPlan} plan!`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('[ManualSubscriptionDialog] error:', err);
      const msg = err instanceof Error ? err.message : 'Error updating subscription';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!client) return null;

  const planOptions: { id: PlanId; name: string; price: string; icon: React.ElementType; color: string; desc: string }[] = [
    {
      id: 'free',
      name: 'Free',
      price: '₹0/mo',
      icon: ShieldCheck,
      color: 'text-muted-foreground border-muted-foreground/30 bg-muted/20',
      desc: '10 Contacts • 200 Msgs • 1 WA Connection',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹499/mo',
      icon: Zap,
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      desc: '1,000 Contacts • Unlimited Msgs • 1 WA Connection • AI Bot',
    },
    {
      id: 'business',
      name: 'Business',
      price: '₹3,000/mo',
      icon: Building2,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      desc: '7,000 Contacts • 5 WA Connections • Contact Delete • Broadcasts',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '₹8,999/mo',
      icon: Crown,
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      desc: 'Unlimited Contacts & Connections • Dedicated Priority Server',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-card text-foreground sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Manage Client Subscription
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manual plan override and validity extension for{' '}
                <strong className="text-foreground">{client.name}</strong> ({client.owner?.email || client.id})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3 text-sm">
          {/* 1. Plan Selection Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Subscription Plan
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {planOptions.map((p) => {
                const isSelected = selectedPlan === p.id;
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10 ring-2 ring-primary/30'
                        : 'border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${p.color}`}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm leading-none text-foreground flex items-center gap-1.5">
                            {p.name}
                            {isSelected && (
                              <CheckCircle2 className="size-3.5 text-primary" />
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {p.price}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Subscription Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subscription Status</Label>
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || 'active')}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="active">Active (Full Access)</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="paused">Paused (Temporarily locked)</SelectItem>
                  <SelectItem value="past_due">Past Due (Grace period)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired (Locked)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Validity / Expiry Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valid Until (Expiry Date)</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-10 rounded-xl bg-muted/40 border-border font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Quick Extension Chips */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" /> Quick Validity Extender
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-border hover:bg-primary/10 hover:text-primary"
                onClick={() => handleQuickExtend(30)}
              >
                +1 Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-border hover:bg-primary/10 hover:text-primary"
                onClick={() => handleQuickExtend(90)}
              >
                +3 Months
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-border hover:bg-primary/10 hover:text-primary"
                onClick={() => handleQuickExtend(180)}
              >
                +6 Months
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-border hover:bg-primary/10 hover:text-primary"
                onClick={() => handleQuickExtend(365)}
              >
                +1 Year
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                onClick={() => handleQuickExtend(36500)}
              >
                🌟 Lifetime (2099)
              </Button>
            </div>
          </div>

          {/* 4. Reason / Audit Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Admin Note / Reason (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. VIP client upgrade, special complimentary grant, offline payment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 rounded-xl bg-muted/40 border-border text-sm placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl border-border hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Applying Changes…
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-1.5" />
                Save & Apply Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
