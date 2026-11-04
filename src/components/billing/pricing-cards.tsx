'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLAN_LIST, type PlanConfig, type PlanId } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  Radio,
  Building,
  Users,
  MessageSquare,
  MessageCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  QrCode,
  ShieldCheck,
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
import { useAuth } from '@/hooks/use-auth';
import { siteConfig } from '@/lib/config/site';

interface PricingCardsProps {
  currentPlanId?: PlanId;
  onPlanUpgraded?: () => void;
}

export function PricingCards({ currentPlanId = 'free', onPlanUpgraded }: PricingCardsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account, accountId, user, profile } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>(PLAN_LIST);
  const [manualPlanModal, setManualPlanModal] = useState<PlanConfig | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-trigger if ?upgrade=planId is in query params
  useEffect(() => {
    const autoPlanId = searchParams?.get('upgrade') as PlanId;
    if (autoPlanId && autoPlanId !== 'free' && autoPlanId !== currentPlanId) {
      const match = plans.find((p) => p.id === autoPlanId);
      if (match) {
        setManualPlanModal(match);
      }
    }
  }, [searchParams, currentPlanId, plans]);

  const cleanPhone = '918653678794';
  const upiId = '8653678794@upi';

  const generateWhatsAppMessage = (plan: PlanConfig) => {
    const isRenew = plan.id === currentPlanId;
    return `Hi NX CRM Team! I want to ${isRenew ? 'renew' : 'upgrade to'} the *${plan.name} Plan* (₹${plan.price.toLocaleString('en-IN')}/month).

📋 Workspace Details:
• Workspace: ${account?.name || 'My Workspace'}
• Account ID: ${accountId || 'N/A'}
• User Email: ${user?.email || profile?.email || 'N/A'}

WhatsApp Support: +91 8653678794
UPI ID: 8653678794@upi

Please share payment confirmation and activate my subscription.`;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleOpenWhatsApp = (plan: PlanConfig) => {
    const message = generateWhatsAppMessage(plan);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp Support (+91 8653678794)... Send your message to complete activation!');
  };

  const handleSelectPlan = (plan: PlanConfig) => {
    if (plan.id === 'free') {
      return;
    }

    // Automatically open WhatsApp and show the modal with details
    handleOpenWhatsApp(plan);
    setManualPlanModal(plan);
  };

  return (
    <div className="space-y-8" id="pricing-plans-section">
      {/* Top Banner: WhatsApp Manual Subscription Notice */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <MessageCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-foreground text-sm">
                Manual Payment via WhatsApp Support
              </h4>
              <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-0.5">
                WA: +91 8653678794
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
              অনলাইন Razorpay গেটওয়ে বন্ধ আছে। যেকোনো প্ল্যান সাবস্ক্রিপশন বা আপগ্রেড করতে সরাসরি আমাদের অফিশিয়াল WhatsApp সাপোর্টে (<strong>+91 8653678794</strong>) মেসেজ দিন। UPI ID: <strong>8653678794@upi</strong>
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `Hi NX CRM Team! I want to manually pay and activate my subscription for workspace ${accountId || ''}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 sm:self-center"
        >
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs h-10 px-4 font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5">
            <MessageCircle className="size-4" />
            <span>Chat on WhatsApp (+91 8653678794)</span>
          </Button>
        </a>
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md',
                isPopular
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.02] bg-gradient-to-b from-card via-card to-emerald-500/5'
                  : isEnterprise
                  ? 'border-purple-500/40 bg-gradient-to-b from-card via-card to-purple-500/5'
                  : 'border-border/80'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white font-semibold px-3 py-0.5 text-[11px] shadow-sm tracking-wide uppercase">
                    ⭐ Most Popular
                  </Badge>
                </div>
              )}

              {isEnterprise && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-3 py-0.5 text-[11px] shadow-sm tracking-wide uppercase">
                    👑 Highest Limit
                  </Badge>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    {isCurrent && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="my-6 pb-6 border-b border-border/60">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      / month
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    {plan.price === 0 ? (
                      'Forever free basic tier'
                    ) : (
                      <>
                        <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                        <span className="truncate">Manual on WhatsApp: +91 8653678794</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Key Quota Badges */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <Users className="size-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Contacts:</span>
                    <span className="font-semibold text-foreground ml-auto">
                      {plan.contactLimit ? plan.contactLimit.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <MessageSquare className="size-3.5 text-blue-500 shrink-0" />
                    <span className="text-muted-foreground">Monthly Msgs:</span>
                    <span className="font-semibold text-foreground ml-auto">
                      {plan.monthlyMessageLimit ? plan.monthlyMessageLimit.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <Radio className="size-3.5 text-purple-500 shrink-0" />
                    <span className="text-muted-foreground">WA Numbers:</span>
                    <span className="font-semibold text-foreground ml-auto">
                      {plan.whatsappConnectionLimit ?? 'Unlimited'}
                    </span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Included Features:
                  </span>
                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mt-0.5">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                        <span className="text-foreground leading-snug">{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                {isCurrent ? (
                  <div className="space-y-2">
                    <Button
                      disabled
                      variant="outline"
                      className="w-full h-10 rounded-2xl font-semibold text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-600 cursor-default"
                    >
                      Active Plan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full h-8 text-[11px] text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
                    >
                      <MessageCircle className="size-3 mr-1 text-emerald-500" />
                      <span>Renew via WhatsApp</span>
                    </Button>
                  </div>
                ) : plan.id === 'free' ? (
                  <Button
                    disabled
                    variant="ghost"
                    className="w-full h-11 rounded-2xl font-semibold text-xs text-muted-foreground"
                  >
                    Default Free Tier
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'w-full h-11 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5',
                      isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : isEnterprise
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    )}
                  >
                    <MessageCircle className="size-4 mr-1 text-white" />
                    <span>Upgrade via WhatsApp</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Subscription WhatsApp Dialog */}
      <Dialog open={Boolean(manualPlanModal)} onOpenChange={(open) => !open && setManualPlanModal(null)}>
        {manualPlanModal && (
          <DialogContent className="sm:max-w-lg border-border bg-card text-foreground">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Upgrade to {manualPlanModal.name} Plan
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Manual subscription activation via WhatsApp Support
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Selected Plan Summary */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-sm text-foreground">{manualPlanModal.name} Monthly Plan</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{manualPlanModal.price.toLocaleString('en-IN')}{' '}
                    <span className="text-[11px] font-normal text-muted-foreground">/ month</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Contacts</span>
                    <span className="font-bold text-foreground">
                      {manualPlanModal.contactLimit ? manualPlanModal.contactLimit.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Monthly Msgs</span>
                    <span className="font-bold text-foreground">
                      {manualPlanModal.monthlyMessageLimit ? manualPlanModal.monthlyMessageLimit.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">WA Numbers</span>
                    <span className="font-bold text-foreground">
                      {manualPlanModal.whatsappConnectionLimit ?? 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workspace Details for Reference */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Building className="size-3.5 text-primary" />
                    Your Workspace Details
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(accountId || '', 'Account ID')}
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {copiedField === 'Account ID' ? (
                      <CheckCircle2 className="size-3 text-emerald-500 mr-1" />
                    ) : (
                      <Copy className="size-3 mr-1" />
                    )}
                    {copiedField === 'Account ID' ? 'Copied' : 'Copy ID'}
                  </Button>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workspace:</span>
                    <span className="font-bold text-foreground truncate max-w-[200px]">
                      {account?.name || 'My Workspace'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account ID:</span>
                    <span className="text-foreground truncate max-w-[200px]">
                      {accountId || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground truncate max-w-[200px]">
                      {user?.email || profile?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details & Steps */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-emerald-500" />
                    <span className="font-bold text-foreground text-xs">Direct UPI & Payment Support</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(upiId, 'UPI ID')}
                    className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {copiedField === 'UPI ID' ? (
                      <CheckCircle2 className="size-3 text-emerald-500 mr-1" />
                    ) : (
                      <Copy className="size-3 mr-1" />
                    )}
                    {copiedField === 'UPI ID' ? 'Copied UPI' : 'Copy UPI ID'}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-card/80 border border-emerald-500/20 px-3 py-2 font-mono text-xs text-foreground">
                  <span>UPI ID: <strong className="text-emerald-600 dark:text-emerald-400">{upiId}</strong></span>
                  <span className="text-muted-foreground text-[10px]">+91 8653678794</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  <p className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 shrink-0">1.</span>
                    <span>Tap <strong>&ldquo;Chat on WhatsApp Support&rdquo;</strong> to automatically send your workspace and plan details.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 shrink-0">2.</span>
                    <span>Complete payment via UPI (GPay, PhonePe, Paytm) or Bank Transfer.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 shrink-0">3.</span>
                    <span>Send the payment screenshot in chat. Our team activates your workspace plan immediately.</span>
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(
                    generateWhatsAppMessage(manualPlanModal),
                    'Message Details'
                  )
                }
                className="text-xs h-10 rounded-xl border-border sm:w-auto w-full"
              >
                {copiedField === 'Message Details' ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500 mr-1.5" />
                ) : (
                  <Copy className="size-3.5 mr-1.5" />
                )}
                <span>{copiedField === 'Message Details' ? 'Message Copied' : 'Copy Message Text'}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => handleOpenWhatsApp(manualPlanModal)}
                className="text-xs h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex-1 shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="size-4 mr-1.5" />
                <span>Chat on WhatsApp to Pay</span>
                <ExternalLink className="size-3.5 ml-1.5" />
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Enterprise Custom Note */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-card via-muted/30 to-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 shrink-0">
            <Building className="size-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">Need Custom Integrations or High-Volume WhatsApp throughput?</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Enterprise plans support dedicated WhatsApp Business throughput tiers, custom webhook gateways, SOC2 reporting, and customized multi-tenant setups.
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hi NX CRM Sales! I would like to inquire about Enterprise Custom Plans, dedicated WhatsApp throughput, and custom SLA.')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="rounded-xl text-xs h-10 px-5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold shrink-0">
            <MessageCircle className="size-3.5 mr-1.5 text-emerald-500" />
            WhatsApp Sales (+91 8653678794)
          </Button>
        </a>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <Shield className="size-5 text-emerald-500 shrink-0" />
          <div>
            <h5 className="text-xs font-bold text-foreground">Official WhatsApp Cloud API</h5>
            <p className="text-[11px] text-muted-foreground">Direct Meta BSP connection without third-party markups.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <Zap className="size-5 text-amber-500 shrink-0" />
          <div>
            <h5 className="text-xs font-bold text-foreground">Fast WhatsApp Activation</h5>
            <p className="text-[11px] text-muted-foreground">Direct support activation immediately upon transfer confirmation.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <Building className="size-5 text-blue-500 shrink-0" />
          <div>
            <h5 className="text-xs font-bold text-foreground">Cancel Anytime</h5>
            <p className="text-[11px] text-muted-foreground">No lock-in contracts. You retain your CRM data forever.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
