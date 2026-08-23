import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MARKETING_INTEGRATIONS,
  MarketingIntegration,
} from '@/lib/integrations/marketing-integrations';
import {
  MessageSquare,
  Send,
  Mail,
  Calendar,
  FileSpreadsheet,
  CreditCard,
  Webhook,
  DollarSign,
  Camera,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

const ICON_MAP: Record<string, typeof MessageSquare> = {
  MessageSquare,
  Send,
  Mail,
  Calendar,
  FileSpreadsheet,
  CreditCard,
  Webhook,
  DollarSign,
  Camera,
  Instagram: Camera,
};

export async function generateStaticParams() {
  return MARKETING_INTEGRATIONS.map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = MARKETING_INTEGRATIONS.find((i) => i.slug === slug);
  if (!item) return { title: 'Integration Not Found' };

  return {
    title: `${item.name} Integration for WhatsApp CRM — NX CRM`,
    description: item.description,
  };
}

export default async function IntegrationDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = MARKETING_INTEGRATIONS.find((i) => i.slug === slug);

  if (!item) {
    notFound();
  }

  const Icon = ICON_MAP[item.iconName] || MessageSquare;
  const isAvailable = item.status === 'Available';

  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/integrations" className="hover:text-slate-900">Integrations</Link>
          <span>/</span>
          <span className="text-blue-700 font-bold">{item.name}</span>
        </div>

        {/* Integration Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-md mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
                <Icon className="size-7 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {item.name}
                  </h1>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isAvailable
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.tagline}</p>
              </div>
            </div>

            {isAvailable ? (
              <Link href="/login">
                <Button className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md">
                  Connect in Settings
                </Button>
              </Link>
            ) : (
              <Button disabled variant="outline" className="h-11 px-6 rounded-xl border-slate-200 text-slate-400 text-xs font-semibold">
                Coming Soon
              </Button>
            )}
          </div>

          <div className="pt-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              What it does
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">{item.whatItDoes}</p>
          </div>
        </div>

        {/* How it works & Key features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* How It Works */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">How it works</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{item.howItWorks}</p>
          </div>

          {/* Security & Token Storage */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Security & Privacy</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{item.securityInfo}</p>
          </div>
        </div>

        {/* Key Features List */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 mb-12 space-y-4 shadow-md">
          <h3 className="text-base font-bold text-slate-900">Key Capabilities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {item.keyFeatures.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Steps */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 mb-12 space-y-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Step-by-Step Setup Guide</h3>
          <div className="space-y-3">
            {item.setupSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  {idx + 1}
                </span>
                <span className="text-slate-700 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-slate-50 to-teal-50 p-8 sm:p-10 shadow-md">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Ready to configure {item.name}?
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
            Log in to your NX CRM workspace or create a free account to activate this integration.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/signup">
              <Button className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md">
                Get Started Free
              </Button>
            </Link>
            <Link href="/integrations">
              <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                All Integrations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
