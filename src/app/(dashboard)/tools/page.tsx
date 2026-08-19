'use client';

import Link from 'next/link';
import {
  Sparkles,
  Link as LinkIcon,
  MousePointerClick,
  QrCode,
  Code2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Smartphone,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ToolsHubPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="size-3" />
              <span>NX CRM Free Suite</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            WhatsApp Growth Tools
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Free utilities to generate click-to-chat links, high-res QR codes, and website widgets for your brand.
          </p>
        </div>
      </div>

      {/* Main Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool 1: WhatsApp Link Generator */}
        <div className="group relative rounded-3xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <LinkIcon className="size-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Direct Link & QR
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                WhatsApp Link Generator
              </h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Create a customized direct click-to-chat link with pre-filled messages. Perfect for social media bios, email signatures, advertising campaigns, and printed flyers.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-muted-foreground pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span>Select from authorized WhatsApp accounts or enter manually</span>
              </li>
              <li className="flex items-center gap-2">
                <QrCode className="size-4 text-emerald-400 shrink-0" />
                <span>Instant high-resolution QR code generator with 1-click PNG download</span>
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="size-4 text-emerald-400 shrink-0" />
                <span>Interactive live WhatsApp chat preview mockup</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Link href="/tools/whatsapp-link">
              <Button className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <span>Open Link Generator</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Tool 2: WhatsApp Button Generator */}
        <div className="group relative rounded-3xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <MousePointerClick className="size-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Website Widget
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-teal-400 transition-colors">
                WhatsApp Button Generator
              </h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Design floating or inline WhatsApp chat widgets for your website. Customize colors, greeting tooltips, position, and copy ready-to-paste embed codes.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-muted-foreground pt-2">
              <li className="flex items-center gap-2">
                <Globe className="size-4 text-teal-400 shrink-0" />
                <span>Live website mockup that updates immediately as settings change</span>
              </li>
              <li className="flex items-center gap-2">
                <Code2 className="size-4 text-teal-400 shrink-0" />
                <span>Zero-dependency HTML/CSS & React JSX embed snippets</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="size-4 text-teal-400 shrink-0" />
                <span>Floating pill, circular icon-only, and inline button styles</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Link href="/tools/whatsapp-button">
              <Button className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2">
                <span>Open Button Generator</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Security & Multi-Tenant Callout Strip */}
      <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Multi-Tenant Organization Security</h4>
            <p className="text-[11px] text-muted-foreground">
              Team members can only select numbers authorized under their account role. No Cloud API credentials or tokens are ever exposed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            <span>100% Free CRM Feature</span>
          </span>
        </div>
      </div>
    </div>
  );
}
