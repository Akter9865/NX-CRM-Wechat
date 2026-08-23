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
  Loader2,
  Radio,
  Building,
  Users,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingCardsProps {
  currentPlanId?: PlanId;
  onPlanUpgraded?: () => void;
}

export function PricingCards({ currentPlanId = 'free', onPlanUpgraded }: PricingCardsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanConfig[]>(PLAN_LIST);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

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
        handleSelectPlan(match);
      }
    }
  }, [searchParams, currentPlanId, plans]);

  // Load Razorpay Checkout Script Dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (plan.id === 'free') {
      return;
    }

    if (plan.id === currentPlanId) {
      toast.info(`You are currently on the ${plan.name} plan.`);
      return;
    }

    try {
      setLoadingPlan(plan.id);

      // Ensure SDK script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Failed to load Razorpay payment gateway. Please check your internet connection.');
        return;
      }

      // 1. Create order on server
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment gateway');
      }

      const { orderId, subscriptionId, keyId, amount, currency } = data;

      // 2. Open Razorpay Checkout modal
      const options: Record<string, unknown> = {
        key: keyId,
        amount: amount || plan.price * 100,
        currency: currency || 'INR',
        name: 'NX CRM Enterprise',
        description: `${plan.name} Plan — 1 Month Access (₹${plan.price})`,
        image: '/icon',
        handler: async function (response: any) {
          try {
            // 3. Authoritative server-side verification
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || orderId,
                razorpay_subscription_id: response.razorpay_subscription_id || subscriptionId,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            toast.success(`🎉 Payment verified! Successfully upgraded to ${plan.name} Plan.`);
            onPlanUpgraded?.();
            router.push('/billing');
            router.refresh();
          } catch (verifyErr: unknown) {
            const errorMessage = verifyErr instanceof Error ? verifyErr.message : 'Payment confirmation failed';
            console.error('Verification error:', verifyErr);
            toast.error(errorMessage);
          }
        },
        theme: {
          color: '#10b981',
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          },
        },
      };

      if (orderId) {
        options.order_id = orderId;
      } else if (subscriptionId) {
        options.subscription_id = subscriptionId;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Could not initiate checkout';
      console.error('Subscription error:', err);
      toast.error(errorMessage);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-10" id="pricing-plans-section">
      {/* Plan Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md',
                isPopular
                  ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20 scale-[1.02] bg-gradient-to-b from-card via-card to-primary/5'
                  : isEnterprise
                  ? 'border-purple-500/40 bg-gradient-to-b from-card via-card to-purple-500/5'
                  : 'border-border/80'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-0.5 text-[11px] shadow-sm tracking-wide uppercase">
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
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {plan.price === 0 ? 'Forever free basic tier' : 'Billed monthly, cancel anytime'}
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
                  <Button
                    disabled
                    variant="outline"
                    className="w-full h-11 rounded-2xl font-semibold text-xs border-border bg-muted/40 text-muted-foreground cursor-default"
                  >
                    Active Plan
                  </Button>
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
                    disabled={isLoading}
                    className={cn(
                      'w-full h-11 rounded-2xl font-semibold text-xs shadow-md transition-all',
                      isPopular
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                        : isEnterprise
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
                        : 'bg-card text-foreground border border-border hover:bg-muted'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        <span>Initializing Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-3.5 mr-1.5" />
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="size-3.5 ml-1.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
        <a href="mailto:sales@wacrm.io?subject=Enterprise%20Inquiry%20-%20NX%20CRM">
          <Button variant="outline" className="rounded-xl text-xs h-10 px-5 border-border font-semibold shrink-0">
            <Sparkles className="size-3.5 mr-1.5 text-purple-500" />
            Contact Sales
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
            <h5 className="text-xs font-bold text-foreground">Instant Plan Activation</h5>
            <p className="text-[11px] text-muted-foreground">Upgrades take effect immediately upon payment confirmation.</p>
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
