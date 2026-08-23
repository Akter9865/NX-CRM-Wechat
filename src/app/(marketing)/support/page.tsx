import Link from 'next/link';
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Zap,
  CreditCard,
  Code2,
  PhoneCall,
  ShieldCheck,
  ArrowRight,
  FileQuestion,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Help Center & Support — Guides, Setup & Technical Assistance',
  description:
    'Need help with NX CRM? Browse our setup guides for WhatsApp Cloud API, Shared Inbox, Visual Automations, Billing, and Public REST APIs, or contact our support team.',
};

const SUPPORT_CATEGORIES = [
  {
    title: 'Getting Started Guide',
    desc: 'Quick start checklist to register your account, create your workspace, and invite your team.',
    href: '/docs/getting-started',
    icon: BookOpen,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    title: 'WhatsApp Cloud API Setup',
    desc: 'Step-by-step Meta Developer setup: Phone Number ID, WABA ID, and permanent System User Tokens.',
    href: '/docs/connect-whatsapp',
    icon: MessageSquare,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: 'Shared Inbox & Team Management',
    desc: 'Learn how to assign conversations, invite agents, leave internal notes, and manage the 24h timer.',
    href: '/docs/shared-inbox',
    icon: Users,
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    title: 'Visual Automation & Flow Builder',
    desc: 'How to construct branching keyword triggers, conditions, delays, and outbound webhooks.',
    href: '/docs/automation',
    icon: Zap,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    title: 'Billing, Plans & Invoices',
    desc: 'Managing Razorpay subscriptions, upgrades, cancellations, and monthly quotas.',
    href: '/docs/billing',
    icon: CreditCard,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    title: 'Public REST API & Webhooks',
    desc: 'Endpoints for programmatic message dispatch, contact synchronization, and event webhooks.',
    href: '/docs/api',
    icon: Code2,
    color: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
  },
];

export default function SupportPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <HelpCircle className="size-3.5 text-emerald-600" />
            <span>Help Center & Knowledge Base</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            How Can We{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Help You?
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Browse our technical documentation, setup guides, and operational tutorials to get the most out of your NX CRM workspace.
          </p>
        </div>

        {/* Support Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {SUPPORT_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link
                key={idx}
                href={cat.href}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/70 p-7 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className={`flex size-12 items-center justify-center rounded-2xl border ${cat.iconBg} mb-5`}>
                    <Icon className={`size-6 ${cat.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors">
                  <span>Open Guide</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Dedicated Support Channels Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 space-y-4 shadow-md">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <PhoneCall className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Direct Technical Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Facing an issue with your Meta webhook handshake, template approval, or subscription? Reach out directly to our engineering team.
            </p>
            <div className="pt-2">
              <Link href="/contact?dept=support">
                <Button className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md">
                  Contact Tech Support
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 space-y-4 shadow-md">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
              <FileQuestion className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find answers to common questions about message quotas, multi-number connections, GDPR/DPDP privacy compliance, and billing.
            </p>
            <div className="pt-2">
              <Link href="/faq">
                <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                  View All FAQs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
