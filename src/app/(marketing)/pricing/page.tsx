import Link from 'next/link';
import { PlanConfig } from '@/lib/billing/plans';
import { getDynamicPlans } from '@/lib/billing/dynamic-plans';
import {
  Check,
  X,
  Zap,
  ArrowRight,
  Shield,
  Sparkles,
  Users,
  MessageSquare,
  Radio,
  Building,
  HelpCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Pricing & Plans — Transparent Monthly WhatsApp CRM Billing',
  description:
    'Explore simple, transparent monthly pricing for NX CRM. Free forever tier, Pro at ₹499/mo, Business at ₹3,000/mo, and Enterprise at ₹8,999/mo. Powered by Razorpay.',
};

const COMPARISON_ROWS = [
  { feature: 'Contact Capacity', free: '10', pro: '1,000', business: '7,000', enterprise: 'Unlimited' },
  { feature: 'Monthly Message Bandwidth', free: '200', pro: 'Unlimited*', business: 'Unlimited*', enterprise: 'Unlimited*' },
  { feature: 'WhatsApp API Connections', free: '1', pro: '1', business: '5', enterprise: 'Unlimited' },
  { feature: 'Shared Team Inbox', free: true, pro: true, business: true, enterprise: true },
  { feature: 'Live 24h Service Window Timer', free: true, pro: true, business: true, enterprise: true },
  { feature: 'Private Team Internal Notes', free: true, pro: true, business: true, enterprise: true },
  { feature: 'HSM Verified Message Templates', free: 'Basic', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Visual Workflow Automations', free: '3 Flows', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'AI Auto-Replies (BYOK Gemini/OpenAI)', free: false, pro: true, business: true, enterprise: true },
  { feature: 'RAG AI Knowledge Base', free: false, pro: true, business: true, enterprise: true },
  { feature: 'Kanban Lead Pipelines', free: '1 Pipeline', pro: '5 Pipelines', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Payment Link Generator (Razorpay/PhonePe)', free: false, pro: true, business: true, enterprise: true },
  { feature: 'Google Sheets Live Sync', free: false, pro: true, business: true, enterprise: true },
  { feature: 'Public REST API & Outbound Webhooks', free: false, pro: true, business: true, enterprise: true },
  { feature: 'Broadcast Campaigns Eligibility', free: false, pro: false, business: 'Coming Soon', enterprise: 'Coming Soon' },
  { feature: 'Multi-Role Permissions (Owner/Admin/Agent)', free: false, pro: true, business: true, enterprise: true },
  { feature: 'Support Level', free: 'Community', pro: 'Standard Email', business: 'Priority Support', enterprise: 'Dedicated SLA & Manager' },
];

const PRICING_FAQS = [
  {
    q: 'Are there any hidden Meta messaging markups?',
    a: 'No. NX CRM connects directly to your own Meta Cloud API app. Meta bills messaging fees directly to your Meta payment method at standard cost with zero markup by NX CRM.',
  },
  {
    q: 'How does payment and activation work?',
    a: 'When you choose a paid tier, checkout is processed via Razorpay. Your subscription is activated immediately upon server verification of the payment signature.',
  },
  {
    q: 'Can I change my plan or cancel anytime?',
    a: 'Yes, you can upgrade, downgrade, or cancel directly from your CRM Billing tab at any time without locking contracts.',
  },
  {
    q: 'What happens to my customer contacts if my subscription expires?',
    a: 'Your data is securely preserved. You enter a grace period where your historical conversations, tags, and CRM contacts remain intact.',
  },
];

export default async function PricingPage() {
  const plans = await getDynamicPlans();

  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <Zap className="size-3.5 text-emerald-600" />
            <span>Simple, Transparent Monthly Billing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Predictable Pricing for{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Every Business
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            No long-term lock-ins. Start free, upgrade as your WhatsApp contact volume grows, and cancel anytime with full data retention.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-20">
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
                ? 'Start Pro'
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
                      🔥 Recommended for Teams
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
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div
                            className={cn(
                              'flex size-4 shrink-0 items-center justify-center rounded-full mt-0.5',
                              f.included
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            )}
                          >
                            {f.included ? (
                              <Check className="size-2.5 stroke-[3]" />
                            ) : (
                              <X className="size-2.5 stroke-[3]" />
                            )}
                          </div>
                          <span
                            className={cn(
                              'leading-tight',
                              f.included ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'
                            )}
                          >
                            {f.name}
                            {f.note && (
                              <span className="block text-[10px] text-slate-400 font-normal no-underline">
                                ({f.note})
                              </span>
                            )}
                          </span>
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

        {/* Feature Comparison Table */}
        <div className="mb-20 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Full Feature Comparison Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Detailed breakdown of entitlements and capabilities across all plans.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-4 font-bold text-slate-800 min-w-[200px]">Feature</th>
                    <th className="p-4 font-bold text-slate-800 min-w-[120px]">Free (₹0)</th>
                    <th className="p-4 font-bold text-emerald-700 min-w-[120px]">Pro (₹499)</th>
                    <th className="p-4 font-bold text-teal-700 min-w-[120px]">Business (₹3,000)</th>
                    <th className="p-4 font-bold text-purple-700 min-w-[120px]">Enterprise (₹8,999)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{row.feature}</td>
                      <td className="p-4">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <X className="size-4 text-slate-300" />
                          )
                        ) : (
                          row.free
                        )}
                      </td>
                      <td className="p-4 font-semibold text-emerald-800">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <X className="size-4 text-slate-300" />
                          )
                        ) : (
                          row.pro
                        )}
                      </td>
                      <td className="p-4 font-semibold text-teal-800">
                        {typeof row.business === 'boolean' ? (
                          row.business ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <X className="size-4 text-slate-300" />
                          )
                        ) : (
                          row.business
                        )}
                      </td>
                      <td className="p-4 font-semibold text-purple-800">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? (
                            <Check className="size-4 text-emerald-600" />
                          ) : (
                            <X className="size-4 text-slate-300" />
                          )
                        ) : (
                          row.enterprise
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
            Billing Questions & Answers
          </h2>
          <div className="space-y-4">
            {PRICING_FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
