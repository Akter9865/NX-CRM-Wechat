import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, MessageSquare, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50/60">
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-100/50 blur-[130px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-100/40 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-teal-100/40 blur-[120px] rounded-full" />

      {/* Grid Pattern Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <MessageSquare className="size-3.5 text-emerald-600" />
            <span>Official WhatsApp Cloud API v22.0</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-800 shadow-sm backdrop-blur-md">
            <Sparkles className="size-3.5 text-indigo-600" />
            <span>Powered by Nexora Spark Agency</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Turn WhatsApp Conversations Into{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Business Growth
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Manage WhatsApp conversations, segmented broadcast campaigns, visual automations, and BYOK AI auto-replies in one modern CRM workspace.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <Link href="/features" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-13 px-8 rounded-2xl border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-700 font-semibold text-sm shadow-sm transition-all"
              >
                <span>Explore Features</span>
              </Button>
            </Link>
          </div>

          {/* Quick Value Bullets */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="font-medium">₹0 Free Tier to Start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="font-medium">No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="font-medium">Instant Meta Cloud API Connect</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Showcase Frame */}
        <div className="relative mt-12 md:mt-16 max-w-5xl mx-auto">
          <div className="relative rounded-3xl border border-slate-200/90 bg-white p-2 sm:p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl group">
            {/* Glowing Accent Border */}
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 opacity-20 blur-lg group-hover:opacity-30 transition-opacity" />

            <div className="relative overflow-hidden rounded-2xl bg-slate-50 border border-slate-200">
              <Image
                src="/images/marketing/hero-showcase.png"
                alt="NX CRM WhatsApp Workspace Showcase with Shared Inbox, Broadcasts and Analytics"
                width={1200}
                height={800}
                priority
                className="w-full h-auto object-cover rounded-2xl transform transition-transform duration-700 hover:scale-[1.01]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
