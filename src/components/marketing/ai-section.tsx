'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  FileText,
  Languages,
  Target,
  BookOpen,
  UserCheck,
  ArrowRight,
  Send,
  CheckCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AI_CAPABILITIES = [
  {
    title: 'AI Reply Suggestions',
    desc: 'Generate contextual, on-brand message drafts in seconds using Google Gemini or OpenAI.',
    status: 'Available',
    icon: Sparkles,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    title: 'Conversation Summary',
    desc: 'Instantly summarize lengthy WhatsApp threads into actionable bullet points for teammates.',
    status: 'Available',
    icon: FileText,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    title: 'AI Knowledge Base (RAG)',
    desc: 'Connect company FAQs and product docs so AI drafts answers grounded in your business data.',
    status: 'Available',
    icon: BookOpen,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: 'Seamless Human Handoff',
    desc: 'AI gracefully transfers complex inquiries to human agents when confidence threshold drops.',
    status: 'Available',
    icon: UserCheck,
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    title: 'Real-time Translation',
    desc: 'Translate incoming multilingual messages and generate replies in the customer’s native language.',
    status: 'Coming Soon',
    icon: Languages,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    title: 'AI Lead Scoring & Sentiment',
    desc: 'Automatically evaluate buying intent, budget signals, and customer sentiment.',
    status: 'Coming Soon',
    icon: Target,
    color: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
  },
];

const DEMO_PROMPTS = [
  {
    id: 'pricing',
    label: '💰 Pricing Inquiry',
    customerQuery: 'How much does your WhatsApp CRM cost for a team of 8 sales agents?',
    aiResponse:
      'Hello! Our Business Plan (₹4,999/month) includes unlimited agent seats, shared inbox delegation, and 7,000 active contacts. Would you like me to reserve an instant onboarding link for your team?',
    confidence: '98.4%',
    latency: '82ms',
  },
  {
    id: 'features',
    label: '⚡ Broadcast & Flows',
    customerQuery: 'Can I send bulk WhatsApp broadcasts without risking a number ban?',
    aiResponse:
      'Yes! NX CRM connects directly to official Meta WhatsApp Cloud API v22.0 using verified templates and automated rate-limiting, ensuring 100% compliance with zero ban risk.',
    confidence: '99.1%',
    latency: '68ms',
  },
  {
    id: 'demo',
    label: '📅 Request Demo',
    customerQuery: 'We want a live product walkthrough for our agency clients.',
    aiResponse:
      'I can schedule that right away! You can also reach our solutions director directly on WhatsApp at +91 8653678794. Would morning or afternoon suit you best?',
    confidence: '97.8%',
    latency: '94ms',
  },
];

export function AiSection() {
  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const activeDemo = DEMO_PROMPTS[selectedDemoIndex];

  useEffect(() => {
    setIsTyping(true);
    setDisplayedResponse('');
    let currentText = '';
    let index = 0;
    const fullText = activeDemo.aiResponse;

    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        setDisplayedResponse(currentText);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 15);

    return () => clearInterval(typingInterval);
  }, [selectedDemoIndex, activeDemo.aiResponse]);

  return (
    <section className="py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-800 shadow-2xs">
            <Bot className="size-3.5 text-purple-600" />
            <span>Interactive BYOK AI Engine</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            AI That Works With{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Your CRM
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Bring your own API key (Google Gemini, OpenAI, Anthropic) or use built-in smart assistance. AI augments your team with instant drafts, thread summaries, and RAG knowledge grounding without taking control away from humans.
          </p>
        </div>

        {/* Live Interactive AI Playground Simulator */}
        <div className="max-w-4xl mx-auto mb-16 rounded-3xl border border-purple-200 bg-gradient-to-b from-purple-50/40 via-white to-slate-50 p-5 sm:p-8 shadow-xl relative overflow-hidden hover-lift">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live AI Reply Playground</h3>
                <p className="text-[11px] text-slate-500">Test how Gemini AI generates instant context-aware replies</p>
              </div>
            </div>

            {/* Prompt Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {DEMO_PROMPTS.map((prompt, idx) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setSelectedDemoIndex(idx)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    selectedDemoIndex === idx
                      ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Simulation Canvas */}
          <div className="mt-6 space-y-4 text-xs">
            {/* Customer Message */}
            <div className="flex flex-col items-start max-w-[85%]">
              <div className="text-[10px] text-slate-500 font-semibold mb-1 pl-1">
                Customer Message (WhatsApp Inbound)
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-slate-100 p-3.5 text-slate-800 border border-slate-200/80 leading-relaxed shadow-2xs">
                {activeDemo.customerQuery}
              </div>
            </div>

            {/* AI Auto-Generated Response */}
            <div className="flex flex-col items-end max-w-[85%] ml-auto">
              <div className="flex items-center gap-2 text-[10px] text-purple-700 font-semibold mb-1 pr-1">
                <span>Google Gemini AI Auto-Draft</span>
                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                  {activeDemo.latency} • {activeDemo.confidence} Confidence
                </span>
              </div>
              <div className="rounded-2xl rounded-tr-xs bg-gradient-to-r from-purple-600 to-indigo-600 p-3.5 text-white leading-relaxed shadow-md shadow-purple-600/20 relative min-h-[50px]">
                {displayedResponse}
                {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-white animate-pulse" />}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 pr-1">
                <span>Auto-drafted in real-time</span>
                <CheckCheck className="size-3.5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 6 Core AI Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {AI_CAPABILITIES.map((item, idx) => {
            const Icon = item.icon;
            const isAvailable = item.status === 'Available';
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm hover:border-purple-300 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex size-10 items-center justify-center rounded-xl border ${item.iconBg} group-hover:scale-110 transition-transform shadow-2xs`}>
                      <Icon className={`size-5 ${item.color}`} />
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isAvailable
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/features/ai-agents">
            <Button className="h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-6 shadow-md shadow-purple-600/20 inline-flex items-center gap-2 transition-all hover:scale-[1.02]">
              <span>Explore AI Capabilities</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
