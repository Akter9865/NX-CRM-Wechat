import Link from 'next/link';
import { PlanConfig } from '@/lib/billing/plans';
import { getDynamicPlans } from '@/lib/billing/dynamic-plans';
import {
  Check,
  Zap,
  ArrowRight,
  Shield,
  Sparkles,
  Users,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export async function PricingPreview({ customPlans }: { customPlans?: PlanConfig[] }) {
  const plans = customPlans || (await getDynamicPlans());

  return (
    <section id="pricing" className="py-20 md:py-28 bg-slate-50/70 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <Zap className="size-3.5" />
            <span>Transparent Monthly Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Plans Built for Teams of{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Every Scale
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Start for ₹0 today with no credit card required. Upgrade anytime with instant Razorpay subscription activation and clear contact capacity.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-12">
          {plans.map((plan: PlanConfig) => {
            const isFree = plan.id === 'free';
            const isPopular = plan.id === 'pro';
            const isBusiness = plan.id === 'business';
            const isEnterprise = plan.id === 'enterprise';

            const ctaHref = isFree ? '/signup' : `/signup?plan=${plan.id}`;
            const ctaLabel =
              isFree
                ? 'Get Started Free'
                : isPopular
                  ? 'Start Pro Plan'
                  : isBusiness
                    ? 'Start Business'
                    : 'Get Enterprise';

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
                  isPopular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : isBusiness
                      ? 'border-teal-500/50 shadow-md'
                      : isEnterprise
                        ? 'border-purple-500/50 shadow-md'
                        : 'border-slate-200'
                )}
              >
                {/* Badges */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white font-bold px-3 py-0.5 text-[10px] tracking-wider uppercase shadow-md shadow-emerald-600/20">
                      ⭐ Most Popular
                    </Badge>
                  </div>
                )}
                {isBusiness && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-teal-600 text-white font-bold px-3 py-0.5 text-[10px] tracking-wider uppercase shadow-md shadow-teal-600/20">
                      🔥 Best for Teams
                    </Badge>
                  </div>
                )}
                {isEnterprise && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white font-bold px-3 py-0.5 text-[10px] tracking-wider uppercase shadow-md shadow-purple-600/20">
                      👑 Unlimited Scale
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="my-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ month</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {plan.price === 0 ? 'Forever free basic tier' : 'Billed monthly via Razorpay'}
                    </span>
                  </div>

                  {/* Quotas */}
                  <div className="space-y-2 mb-6 text-xs">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <Users className="size-3.5 text-blue-600 shrink-0" />
                      <span className="text-slate-600">Contacts:</span>
                      <span className="font-bold text-slate-900 ml-auto">
                        {plan.contactLimit ? plan.contactLimit.toLocaleString() : 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <MessageSquare className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="text-slate-600">Messages:</span>
                      <span className="font-bold text-slate-900 ml-auto">
                        {plan.monthlyMessageLimit ? plan.monthlyMessageLimit.toLocaleString() : 'Unlimited*'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                      <Radio className="size-3.5 text-purple-600 shrink-0" />
                      <span className="text-slate-600">WA Numbers:</span>
                      <span className="font-bold text-slate-900 ml-auto">
                        {plan.whatsappConnectionLimit ?? 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Features Included:
                    </span>
                    <ul className="space-y-2 text-xs">
                      {plan.features.slice(3, 8).map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                          <span className="text-slate-700 leading-tight">{f.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Button CTA */}
                <div className="mt-8 pt-4">
                  <Link href={ctaHref} className="block w-full">
                    <Button
                      className={cn(
                        'w-full h-11 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5',
                        isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          : isBusiness
                            ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20'
                            : isEnterprise
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                      )}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Link to Full Comparison */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>View Full Detailed Plan Comparison Matrix & FAQ</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
