import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Server,
  FileCode2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Security Architecture & Compliance — NX CRM',
  description:
    'Discover how NX CRM protects your WhatsApp CRM data: Supabase Row Level Security (RLS), AES-256 token encryption, HMAC-SHA256 webhook validation, and multi-tenant isolation.',
};

const SECURITY_CONTROLS = [
  {
    title: 'PostgreSQL Row Level Security (RLS)',
    desc: 'Strict multi-tenant database policies ensure workspace members can only access records belonging to their authenticated account.',
    icon: Database,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    title: 'AES-256-GCM Token Encryption',
    desc: 'WhatsApp System User access tokens and third-party API credentials are symmetrically encrypted in the database before storage.',
    icon: KeyRound,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: 'HMAC Webhook Signature Verification',
    desc: 'Every inbound payload from Meta (graph.facebook.com) and Razorpay is verified against a cryptographic SHA-256 digest to prevent spoofing.',
    icon: Lock,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    title: 'Server-Side Meta API Calls',
    desc: 'Meta app secrets and WhatsApp tokens are never exposed to client browsers. All messaging operations occur server-side.',
    icon: Server,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    title: 'Granular Role-Based Access Controls (RBAC)',
    desc: 'Fine-grained permissions: Owner (billing & full control), Admin (config & team), Agent (inbox & deals), and Viewer (read-only).',
    icon: ShieldCheck,
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    title: 'Baseline OWASP Hardening & CSP',
    desc: 'Enforced HSTS, X-Content-Type-Options (nosniff), X-Frame-Options (DENY), strict Referrer-Policy, and restricted Permissions-Policy.',
    icon: FileCode2,
    color: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
  },
];

export default function SecurityPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>Enterprise Trust & Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Security at{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 bg-clip-text text-transparent">
              NX CRM
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            We build security directly into our application layer to protect your customer conversations, contact lists, and API credentials.
          </p>
        </div>

        {/* Security Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {SECURITY_CONTROLS.map((control, idx) => {
            const Icon = control.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`flex size-11 items-center justify-center rounded-xl border ${control.iconBg}`}>
                  <Icon className={`size-5 ${control.color}`} />
                </div>
                <h3 className="text-base font-bold text-slate-900">{control.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{control.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Vulnerability Reporting */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 space-y-4 text-center shadow-md">
          <h3 className="text-xl font-bold text-slate-900">Responsible Disclosure Program</h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
            If you discover a security vulnerability in NX CRM, please report it immediately to our security team. We will acknowledge receipt within 24 hours and investigate with highest priority.
          </p>
          <div className="pt-2">
            <a href={`mailto:${siteConfig.securityEmail}`}>
              <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md">
                Report to {siteConfig.securityEmail}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
