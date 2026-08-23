import Link from 'next/link';
import {
  MARKETING_INTEGRATIONS,
  IntegrationCategory,
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
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Integrations Hub — WhatsApp, Google Sheets, Razorpay, Zoho & Webhooks',
  description:
    'Explore supported integrations for NX CRM: WhatsApp Cloud API, Telegram, Google Sheets, Razorpay, PhonePe, Zoho Mail, Calendly, and Zapier Webhooks.',
};

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

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Integrations' },
  { id: 'messaging', label: 'Messaging Channels' },
  { id: 'payments', label: 'Payment Gateways' },
  { id: 'productivity', label: 'Productivity & Data' },
  { id: 'email', label: 'Email & Alerts' },
  { id: 'crm', label: 'CRM & Sales' },
  { id: 'developer', label: 'Developer & Webhooks' },
];

export default function IntegrationsPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
            <Layers className="size-3.5 text-blue-600" />
            <span>Connected Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Seamlessly Integrate Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Tech Stack
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Connect NX CRM directly to spreadsheets, payment providers, email systems, and 5,000+ apps via webhooks. Real native integrations configured securely inside your workspace.
          </p>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer"
            >
              {cat.label}
            </div>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {MARKETING_INTEGRATIONS.map((item) => {
            const Icon = ICON_MAP[item.iconName] || MessageSquare;
            const isAvailable = item.status === 'Available';

            return (
              <div
                key={item.slug}
                className="relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                      <Icon className="size-6 text-blue-600" />
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {item.categoryLabel}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[48px]">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/integrations/${item.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    <span>View Setup & Details</span>
                    <ArrowRight className="size-3.5" />
                  </Link>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {isAvailable ? 'In-App Connect' : 'Planned'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center rounded-3xl border border-slate-200 bg-slate-50/70 p-10 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Need a custom integration or CRM webhook?</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
            NX CRM includes a robust REST API and outbound webhook system for custom enterprise workflows.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/docs/api">
              <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold">
                Explore Public REST API
              </Button>
            </Link>
            <Link href="/contact?dept=sales">
              <Button className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md">
                Contact Solutions Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
