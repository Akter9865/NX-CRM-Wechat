'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  MessageCircle,
  PhoneCall,
  Zap,
  Bot,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/lib/config/site';

const ROTATING_WORDS = [
  'Business Growth',
  '3x Sales Conversions',
  '24/7 AI Auto-Replies',
  'Automated Pipelines',
  'Multi-Agent Inbox',
];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM Team! I would like to try NX CRM WhatsApp Cloud API and see a live demo.'
  )}`;

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setFadeState('in');
      }, 300);
    }, 2800);

    return () => clearInterval(wordInterval);
  }, []);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setActiveMessageIndex((prev) => (prev + 1) % 3);
    }, 3500);

    return () => clearInterval(msgInterval);
  }, []);

  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 md:pt-20 md:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50/60">
      {/* Background Soft Glows with Animation */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[450px] sm:h-[550px] bg-emerald-100/60 blur-[140px] rounded-full animate-float-slow -z-10" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-blue-100/40 blur-[120px] rounded-full -z-10" />
      <div className="pointer-events-none absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-teal-100/40 blur-[120px] rounded-full -z-10" />

      {/* Grid Pattern Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <MessageSquare className="size-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Official WhatsApp Cloud API v22.0</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-xs font-semibold text-indigo-800 shadow-2xs backdrop-blur-md">
            <Sparkles className="size-3.5 text-indigo-600 shrink-0" />
            <span>Powered by Nexora Spark Agency</span>
          </div>
        </div>

        {/* Hero Copy with Dynamic Rotating Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.15] sm:leading-[1.1] min-h-[75px] sm:min-h-[110px] lg:min-h-[160px]">
            Turn WhatsApp Conversations Into{' '}
            <span
              className={`inline-block transition-all duration-300 transform bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent ${
                fadeState === 'in'
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-2 scale-95'
              }`}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Manage WhatsApp conversations, segmented broadcast campaigns, visual automations, and BYOK AI auto-replies in one modern CRM workspace.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 pt-2 sm:pt-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 sm:h-13 px-6 sm:px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-11 sm:h-13 px-5 sm:px-7 rounded-2xl border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <MessageCircle className="size-4 text-emerald-600" />
                <span>WhatsApp Demo</span>
              </Button>
            </a>

            <Link href="/#contact" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-11 sm:h-13 px-5 sm:px-7 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all"
              >
                <span>Contact Us</span>
              </Button>
            </Link>
          </div>

          {/* Quick Value Bullets */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-3 sm:pt-6 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
              <span className="font-medium">₹0 Free Tier to Start</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
              <span className="font-medium">No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Instant Meta Cloud API Connect</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Showcase Frame with Floating Badges */}
        <div className="relative mt-8 sm:mt-14 md:mt-16 max-w-5xl mx-auto">
          {/* Floating Live Badge top-left */}
          <div className="hidden sm:flex absolute -top-4 -left-4 z-20 items-center gap-2 rounded-2xl bg-white/95 border border-slate-200/90 px-3.5 py-2 shadow-xl backdrop-blur-md animate-float">
            <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-xs">
              <MessageSquare className="size-4" />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-slate-900">250K+ Inbound Chats</div>
              <div className="text-[10px] text-emerald-600 font-medium">Synced via Meta v22.0</div>
            </div>
          </div>

          {/* Floating SLA Badge top-right */}
          <div className="hidden sm:flex absolute -bottom-4 -right-4 z-20 items-center gap-2 rounded-2xl bg-white/95 border border-slate-200/90 px-3.5 py-2 shadow-xl backdrop-blur-md animate-float-slow">
            <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500 text-white font-bold text-xs shadow-xs">
              <Zap className="size-4" />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-slate-900">AI Auto-Reply active</div>
              <div className="text-[10px] text-indigo-600 font-medium">&lt; 3 sec resolution</div>
            </div>
          </div>

          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-2 sm:p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl group hover-lift">
            {/* Dynamic Live Activity Toast Overlay (Desktop & Tablet) */}
            <div className="hidden md:block absolute top-4 left-4 sm:top-6 sm:left-6 z-20 max-w-[280px] sm:max-w-xs transition-all duration-500 transform">
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-3 shadow-xl shadow-slate-900/10 flex items-start gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs">
                  {activeMessageIndex === 0 ? 'RS' : activeMessageIndex === 1 ? <Bot className="size-4 text-purple-600" /> : <Zap className="size-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-900 truncate">
                      {activeMessageIndex === 0 ? 'Rohan Sharma' : activeMessageIndex === 1 ? 'NX AI Auto-Reply' : 'Automation Engine'}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-full shrink-0">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {activeMessageIndex === 0
                      ? '“Hi! Can we assign 10 agents to 1 WhatsApp number?”'
                      : activeMessageIndex === 1
                      ? '“Yes! NX CRM supports round-robin agent assignment & shared inbox.”'
                      : '“Qualified lead auto-routed to Senior Sales Team in Bangalore.”'}
                  </p>
                </div>
              </div>
            </div>

            {/* Glowing Accent Border */}
            <div className="absolute -inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 opacity-20 blur-lg group-hover:opacity-35 transition-opacity" />

            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200">
              <Image
                src="/images/marketing/hero-showcase.png"
                alt="NX CRM WhatsApp Workspace Showcase with Shared Inbox, Broadcasts and Analytics"
                width={1200}
                height={800}
                priority
                className="w-full h-auto object-cover rounded-xl sm:rounded-2xl transform transition-transform duration-700 group-hover:scale-[1.01]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
