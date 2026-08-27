'use client';

import {
  MessageSquare,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Users,
  GitBranch,
} from 'lucide-react';
import { BrandLogo } from '@/components/marketing/brand-logo';

export function AuthBrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-card via-background to-muted/30 p-10 xl:p-14 border-r border-border/70 select-none">
      {/* Dynamic Background Light Orbs & Grid */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Subtle dot matrix grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(var(--border) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient emerald radial glow */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Top Header: Brand & Badge */}
      <div className="relative z-10 space-y-4">
        <BrandLogo size="lg" />

        {/* Headline */}
        <div className="pt-4 max-w-md">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            The Multi-Client WhatsApp & WeChat CRM for Modern Teams.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Unified Shared Inbox, Visual Automations, Multi-Agent Collaboration, and Google Gemini AI Auto-Replies in one high-performance platform.
          </p>
        </div>
      </div>

      {/* Middle Showcase: Floating Interactive Mock UI Cards */}
      <div className="relative z-10 my-8 flex flex-col gap-3.5 max-w-lg">
        {/* Floating Card 1: Incoming WhatsApp Lead */}
        <div className="group relative rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 animate-float">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
                RS
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-foreground">Rahul Sharma</h4>
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-semibold text-blue-400 border border-blue-500/20">
                    High Priority
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  &ldquo;Hi! Looking to connect 5 WhatsApp API numbers for our sales team.&rdquo;
                </p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground/80 shrink-0 font-mono">Just now</span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <PhoneCall className="size-3" />
              <span>WhatsApp Cloud API (+91 98765 43210)</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="size-3 text-muted-foreground" />
              <span>Assigned to Sales</span>
            </div>
          </div>
        </div>

        {/* Floating Card 2: AI Agent Gemini Auto-Reply */}
        <div
          className="relative ml-6 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 hover:border-teal-500/40"
          style={{ animation: 'float 5s ease-in-out infinite 1s' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Bot className="size-3.5" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Google Gemini AI Agent
              </span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
              <Sparkles className="size-2.5" />
              Auto-Replied (98ms)
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed italic bg-muted/40 p-2.5 rounded-xl border border-border/40">
            &ldquo;Hello Rahul! Welcome to NX CRM. I&apos;ve reserved your 5 WhatsApp API slots and scheduled a team walkthrough.&rdquo;
          </p>
        </div>

        {/* Floating Card 3: Visual Automation Engine */}
        <div
          className="relative rounded-2xl border border-border/80 bg-card/90 p-3.5 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 hover:border-blue-500/40"
          style={{ animation: 'float 4.5s ease-in-out infinite 0.5s' }}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Zap className="size-3.5" />
              </div>
              <div>
                <span className="font-semibold text-foreground">Visual Flow: Onboarding Sequence</span>
                <p className="text-[10px] text-muted-foreground">Triggered by tag &apos;new_inbound_lead&apos;</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="size-3" />
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Feature Badges & Trust Metrics */}
      <div className="relative z-10 space-y-4 pt-4 border-t border-border/60">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
            <div className="text-base font-bold text-foreground">99.9%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Uptime SLA</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
            <div className="text-base font-bold text-emerald-400">Multi-API</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">WhatsApp & WeChat</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
            <div className="text-base font-bold text-foreground">SOC2 Ready</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Encrypted CRM</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>End-to-end token encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="size-3.5 text-blue-400" />
            <span>Dynamic Webhook Routing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
