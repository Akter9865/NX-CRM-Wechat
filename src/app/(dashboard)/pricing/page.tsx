import { getCurrentAccount } from '@/lib/auth/account';
import { PricingCards } from '@/components/billing/pricing-cards';
import { type PlanId } from '@/lib/billing/plans';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Pricing & Plans — NX CRM Wechat',
  description: 'Choose the right plan for your team with flexible monthly billing.',
};

export default async function PricingPage() {
  let currentPlanId: PlanId = 'free';

  try {
    const { account, supabase } = await getCurrentAccount();
    if (account) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('account_id', account.id)
        .maybeSingle();

      if (sub?.plan_id) {
        currentPlanId = sub.plan_id as PlanId;
      }
    }
  } catch {
    // User not authenticated or loading
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Zap className="size-3.5" />
          <span>Simple, Transparent Monthly Plans</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Scale your WhatsApp CRM
        </h1>
        <p className="text-sm text-muted-foreground">
          Upgrade your contact capacity, messaging bandwidth, and automation power with real-time Razorpay billing.
        </p>
      </div>

      {/* Pricing Cards & Comparison */}
      <PricingCards currentPlanId={currentPlanId} />
    </div>
  );
}
