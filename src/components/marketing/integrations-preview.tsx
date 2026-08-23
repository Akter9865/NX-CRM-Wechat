import Link from 'next/link';
import {
  FileSpreadsheet,
  Mail,
  CreditCard,
  Smartphone,
  DollarSign,
  Calendar,
  Webhook,
  Send,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREVIEW_INTEGRATIONS = [
  {
    name: 'Google Sheets',
    category: 'Lead Sync & Export',
    desc: 'Auto-sync WhatsApp leads and contacts into Google Sheets in real-time.',
    status: 'Available',
    icon: FileSpreadsheet,
    badge: 'Popular',
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    name: 'Razorpay Payments',
    category: 'Payment Gateways',
    desc: 'Generate dynamic payment links and UPI QR codes inside chat.',
    status: 'Available',
    icon: CreditCard,
    badge: 'Instant UPI',
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    name: 'PhonePe PG',
    category: 'Payment Gateways',
    desc: 'Collect UPI payments directly through PhonePe merchant links.',
    status: 'Available',
    icon: Smartphone,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    name: 'Zoho Mail & CRM',
    category: 'Email & CRM',
    desc: 'Instant lead alert emails via Zoho Mail SMTP and CRM webhooks.',
    status: 'Available',
    icon: Mail,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    name: 'Calendly & Calendar',
    category: 'Booking & Scheduling',
    desc: 'Automated consultation scheduling links sent to WhatsApp contacts.',
    status: 'Available',
    icon: Calendar,
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    name: 'Zapier / Webhooks',
    category: 'Custom Webhooks',
    desc: 'Connect 5,000+ apps via outbound JSON webhooks on CRM events.',
    status: 'Available',
    icon: Webhook,
    badge: 'Universal',
    color: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
  },
  {
    name: 'Stripe Payments',
    category: 'Payment Gateways',
    desc: 'Accept international credit cards and multi-currency checkout links.',
    status: 'Available',
    icon: DollarSign,
    color: 'text-indigo-600',
    iconBg: 'bg-indigo-50 border-indigo-200',
  },
  {
    name: 'Telegram Bot',
    category: 'Messaging',
    desc: 'Two-way Telegram messaging bridge for multichannel support.',
    status: 'Available',
    icon: Send,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
];

export function IntegrationsPreview() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
            <span>Seamless Connectivity</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Connect Your Favorite{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Business Tools
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            NX CRM integrates directly with payment gateways, spreadsheets, appointment calendars, email servers, and custom webhooks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {PREVIEW_INTEGRATIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div className={`flex size-10 items-center justify-center rounded-xl border ${item.iconBg}`}>
                    <Icon className={`size-5 ${item.color}`} />
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {item.category}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/integrations">
            <Button className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-6 shadow-md shadow-blue-600/20 inline-flex items-center gap-2">
              <span>Explore All Integrations & Setup Guides</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
