'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Phone,
  Users,
  Sparkles,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { PLANS, type PlanId } from '@/lib/billing/plans';

export interface DetailedClientData {
  id: string;
  name: string;
  created_at: string;
  default_currency: string;
  owner?: {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  teamCount: number;
  members: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }[];
  subscription: {
    id?: string | null;
    planId: string;
    status: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    updatedAt?: string | null;
  };
  whatsappConnections: {
    id: string;
    phoneNumber?: string;
    verifiedName?: string;
    isConnected: boolean;
    phoneNumberId?: string;
  }[];
  whatsappCount: number;
  usage: {
    contactsCount: number;
    messagesSent: number;
    messagesReceived: number;
    automationRuns: number;
  };
}

interface ClientDetailsSheetProps {
  client: DetailedClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManageSubscription: (client: DetailedClientData) => void;
}

export function ClientDetailsSheet({
  client,
  open,
  onOpenChange,
  onManageSubscription,
}: ClientDetailsSheetProps) {
  if (!client) return null;

  const plan = PLANS[(client.subscription.planId as PlanId) || 'free'];
  const formattedCreated = client.created_at
    ? format(new Date(client.created_at), 'PPP')
    : 'N/A';

  const formattedPeriodEnd = client.subscription.currentPeriodEnd
    ? format(new Date(client.subscription.currentPeriodEnd), 'PPP')
    : 'No Expiry';

  const getPlanBadgeColor = (planId: string) => {
    switch (planId) {
      case 'enterprise':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'business':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'pro':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'trialing':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'paused':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'cancelled':
      case 'expired':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border text-foreground p-6">
        <SheetHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-semibold uppercase text-xs px-2.5 py-0.5 ${getPlanBadgeColor(
                  client.subscription.planId
                )}`}
              >
                {plan?.name || client.subscription.planId} Plan
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 capitalize ${getStatusBadgeColor(
                  client.subscription.status
                )}`}
              >
                {client.subscription.status}
              </Badge>
            </div>
          </div>
          <SheetTitle className="text-xl font-bold mt-2 text-foreground flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            {client.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground font-mono">
            Tenant Account ID: {client.id}
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6 text-sm">
          {/* Quick Subscription Summary Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Current Subscription
              </span>
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onManageSubscription(client);
                }}
                className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm"
              >
                <Sparkles className="size-3.5 mr-1" />
                Change / Extend Plan
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <p className="text-muted-foreground">Tier & Price</p>
                <p className="font-semibold text-foreground text-sm">
                  {plan?.name || client.subscription.planId} ({plan?.price ? `₹${plan.price}/mo` : 'Free'})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Expires On</p>
                <p className="font-semibold text-foreground text-sm">
                  {formattedPeriodEnd}
                </p>
              </div>
            </div>
          </div>

          {/* Account Owner & Registration */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" /> Account Owner & Team
            </h4>
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owner Name:</span>
                <span className="font-semibold text-foreground">
                  {client.owner?.fullName || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owner Email:</span>
                <span className="font-mono text-foreground">
                  {client.owner?.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered On:</span>
                <span className="text-foreground">{formattedCreated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Team Members:</span>
                <span className="font-semibold text-foreground">
                  {client.teamCount} User{client.teamCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Connected WhatsApp Channels */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5 text-emerald-400" /> WhatsApp Connections ({client.whatsappCount})
            </h4>
            {client.whatsappConnections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-3.5 text-center text-xs text-muted-foreground">
                No WhatsApp numbers linked yet.
              </div>
            ) : (
              <div className="space-y-2">
                {client.whatsappConnections.map((wa) => (
                  <div
                    key={wa.id}
                    className="rounded-xl border border-border bg-muted/20 p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {wa.verifiedName || 'WhatsApp Number'}
                      </p>
                      <p className="text-muted-foreground font-mono text-[11px]">
                        {wa.phoneNumber || wa.phoneNumberId || wa.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span className="text-[11px] font-medium">Connected</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Metrics */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-3.5 text-blue-400" /> Monthly Usage & Limits
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Total Contacts</p>
                <p className="text-lg font-bold text-foreground">
                  {client.usage.contactsCount.toLocaleString()}
                  <span className="text-[11px] font-normal text-muted-foreground ml-1">
                    / {plan?.contactLimit ? plan.contactLimit.toLocaleString() : '∞'}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Messages Sent</p>
                <p className="text-lg font-bold text-foreground">
                  {client.usage.messagesSent.toLocaleString()}
                  <span className="text-[11px] font-normal text-muted-foreground ml-1">
                    / {plan?.monthlyMessageLimit ? plan.monthlyMessageLimit.toLocaleString() : '∞'}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Messages Received</p>
                <p className="text-lg font-bold text-foreground">
                  {client.usage.messagesReceived.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Automation Runs</p>
                <p className="text-lg font-bold text-foreground">
                  {client.usage.automationRuns.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Team Members List */}
          {client.members.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Members ({client.members.length})
              </h4>
              <div className="space-y-1.5">
                {client.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {m.fullName || 'Anonymous Member'}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {m.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {m.role || 'Member'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
