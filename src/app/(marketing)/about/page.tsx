import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Target,
  Globe2,
  CheckCircle2,
  MessageSquare,
  Lock,
  ArrowRight,
  Award,
  Building2,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'About Us — NX CRM & Nexora Spark Agency',
  description:
    'Discover the vision behind NX CRM, the modern multi-tenant WhatsApp CRM platform built by Nexora Spark Agency in West Bengal, India.',
};

export default function AboutPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>Built by Nexora Spark Agency</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            We are building the future of{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              WhatsApp-First Commerce & CRM
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed">
            NX CRM was created to liberate businesses from legacy, slow CRMs and exorbitant third-party per-message markups. We provide direct, transparent, and intelligent WhatsApp Cloud API solutions that scale from startup to enterprise.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/80 shadow-xs text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">99.8%</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Rate</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">v22.0</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Meta Cloud API</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">0%</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Messaging Markup</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">256-bit</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">AES Encryption</div>
          </div>
        </div>

        {/* The Mission Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              <Target className="size-3.5 text-blue-600" />
              <span>Our Core Mission</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Transforming Conversations into Real Business Revenue
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every day, billions of customers chat on WhatsApp, yet most businesses struggle with disconnected spreadsheets, personal phone numbers, and lost customer histories.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>NX CRM</strong> solves this by bridging the official Meta WhatsApp Cloud API with an enterprise team shared inbox, a drag-and-drop visual automation builder, and intelligent AI agents. From lead capture in Google Sheets to automated payment collection with Razorpay, we give modern teams the power to close deals faster.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <span>Zero Per-Message Markups — Pay Meta directly at standard wholesale rates.</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <span>Built-in Anti-Ban Safeguards — Rate pacing, jitter delays, and auto opt-out.</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <span>BYO AI Key Flexibility — Connect Google Gemini, OpenAI, or Claude with 1 click.</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/40 p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="size-5 text-emerald-600" />
              <span>Entity & Headquarters</span>
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                <strong>Operating Company:</strong> {siteConfig.legalCompanyName}
              </p>
              <p>
                <strong>Brand:</strong> {siteConfig.brand}
              </p>
              <p>
                <strong>Headquarters:</strong> {siteConfig.businessAddress}
              </p>
              <p>
                <strong>Customer Support:</strong> {siteConfig.phone} (WhatsApp & Voice)
              </p>
              <p>
                <strong>Official Email:</strong> {siteConfig.supportEmail}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Meta Platform Compliance Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Our architecture conforms directly with Meta&apos;s WhatsApp Business Messaging Policy, GDPR, and India&apos;s Digital Personal Data Protection (DPDP) Act, 2023.
              </p>
            </div>
          </div>
        </div>

        {/* Four Architectural Pillars */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Why Modern Teams Choose NX CRM</h2>
            <p className="text-xs sm:text-sm text-slate-500">Engineered from day one for maximum deliverability, multi-tenant security, and real-time reliability.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md transition-shadow space-y-3">
              <div className="size-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Anti-Ban Protection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Smart jitter pacing, micro-batch rests, and consecutive error circuit breakers keep your WhatsApp quality score green.
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md transition-shadow space-y-3">
              <div className="size-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Lock className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Tenant Isolation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Supabase Row Level Security (RLS) ensures your customer contacts and API keys are 100% physically isolated from other workspaces.
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md transition-shadow space-y-3">
              <div className="size-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Cpu className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">BYO AI Intelligence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your own Google Gemini or OpenAI key with no per-token markup. Automated auto-replies, smart handoffs, and instant drafting.
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md transition-shadow space-y-3">
              <div className="size-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Zap className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Instant Razorpay UPI</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate real-time UPI payment links and dynamic QR codes directly inside customer chats to collect revenue faster.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Ready to upgrade your business communication?
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
            Get started with a free workspace today or contact our team in West Bengal, India for an interactive live demo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/signup">
              <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2">
                <span>Create Free Workspace</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold">
                <span>Contact Our Sales Team</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
