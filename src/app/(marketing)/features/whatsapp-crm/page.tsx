import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  CheckCircle2,
  Tag,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Users2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'WhatsApp Cloud CRM — Official Meta API Integration',
  description:
    'Connect your WhatsApp Business number to the official Meta Cloud API. Manage contacts, tags, custom fields, verified HSM templates, and delivery receipts in NX CRM.',
};

export default function WhatsAppCrmFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-emerald-700 font-bold">WhatsApp CRM</span>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <MessageSquare className="size-3.5 text-emerald-600" />
              <span>Official Cloud API</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Enterprise WhatsApp CRM,{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Powered by Meta
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Connect your official WhatsApp Business Phone Number ID directly via Meta Cloud API. Eliminate QR code ban risks, access high-speed throughput, and manage your contacts with enterprise structure.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/signup">
                <Button className="h-12 px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2">
                  <span>Connect WhatsApp Free</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/docs/connect-whatsapp">
                <Button variant="outline" className="h-12 px-7 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                  <span>Read Setup Guide</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-xl">
              <Image
                src="/images/marketing/hero-showcase.png"
                alt="WhatsApp CRM Workspace"
                width={650}
                height={480}
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">100% Policy Compliant</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Direct Meta BSP connection means your number is protected against WhatsApp bans that plague third-party unofficial scraping bots.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Tag className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Custom Tags & Attributes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tag contacts by customer segment (VIP, Hot Lead, Renewal, Support), store custom CRM attributes, and trigger target workflows.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Send className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">HSM Message Templates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create, test, and dispatch Meta-approved message templates with buttons, dynamic variables, and media headers outside the 24h window.
            </p>
          </div>
        </div>

        {/* Quick CTA */}
        <div className="text-center rounded-3xl border border-slate-200 bg-slate-50/70 p-10 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to set up your WhatsApp CRM?</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
            Get started on our Free tier today or follow our step-by-step documentation.
          </p>
          <Link href="/signup">
            <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md">
              Create Free Workspace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
