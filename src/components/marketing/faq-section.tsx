'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is NX CRM?',
    answer:
      'NX CRM is an enterprise-grade multi-tenant CRM designed specifically for WhatsApp conversations, customer relationships, visual automations, and AI-assisted workflows. It allows teams to connect official WhatsApp Business numbers, organize contacts, assign chats, and automate sales without passing a single mobile phone around.',
  },
  {
    question: 'How do I connect WhatsApp to NX CRM?',
    answer:
      'NX CRM integrates directly with the official WhatsApp Cloud API by Meta. In your workspace Settings → WhatsApp tab, you enter your Meta Phone Number ID, WhatsApp Business Account ID (WABA ID), and System User Access Token. Once entered, NX CRM automatically configures webhooks to receive and send messages in real-time.',
  },
  {
    question: 'What is the WhatsApp Cloud API?',
    answer:
      'WhatsApp Cloud API is Meta’s official, cloud-hosted messaging platform for businesses. Unlike risky third-party QR-code scraping bots, Cloud API is 100% compliant with Meta policies, has high messaging throughput, delivers real-time delivery receipts, and protects your phone number from unprompted bans.',
  },
  {
    question: 'Can I connect multiple WhatsApp numbers?',
    answer:
      'Yes! NX CRM supports multi-client and multi-number connections. On Business plans, you can connect up to 5 WhatsApp API numbers, and on Enterprise plans, you can connect unlimited numbers for different regional branches or business units.',
  },
  {
    question: 'Does NX CRM support a multi-agent Shared Inbox?',
    answer:
      'Yes. Multiple agents can log into your workspace simultaneously using their individual email accounts and role permissions (Owner, Admin, Agent, Viewer). Agents can claim conversations, assign chats, add internal private team notes, and view the live 24-hour customer service window timer.',
  },
  {
    question: 'Can I automate WhatsApp conversations and workflows?',
    answer:
      'Yes. Our built-in Visual Flow Builder lets you create drag-and-drop workflows triggered by inbound keyword matches, Click-to-WhatsApp ads, or contact creation. You can add conditions, delay nodes, AI reply generators, template messages, and external webhook triggers.',
  },
  {
    question: 'Does NX CRM have AI capabilities?',
    answer:
      'Yes. NX CRM features a Bring-Your-Own-Key (BYOK) AI architecture supporting Google Gemini, OpenAI, and Anthropic. You can use AI to generate contextual message drafts, summarize lengthy customer threads, and ground answers in your business Knowledge Base (RAG).',
  },
  {
    question: 'How does billing work in NX CRM?',
    answer:
      'Billing is handled through Razorpay with transparent monthly pricing in Indian Rupees (₹). We offer a Free tier (₹0/mo), Pro (₹499/mo), Business (₹3,000/mo), and Enterprise (₹8,999/mo). Upgrades take effect immediately upon server-side payment verification.',
  },
  {
    question: 'What happens when a plan expires or payment fails?',
    answer:
      'If a recurring subscription fails or expires, your account enters a grace period. Your CRM data, contacts, and historical message threads remain securely stored and never deleted. You can renew your subscription anytime from the Billing tab.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your subscription at any time directly from the Billing dashboard with no lock-in contracts. You retain access to your plan entitlements until the end of your paid monthly billing cycle.',
  },
  {
    question: 'What integrations are currently supported?',
    answer:
      'NX CRM natively integrates with Google Sheets (real-time lead sync), Razorpay & PhonePe (in-chat payment links), Zoho Mail & SMTP servers (lead email alerts), Calendly & Google Calendar (appointment booking), Telegram Bot, and custom JSON Webhooks.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can reach our dedicated support team via email at support@nxcrm.online or submit an inquiry through our public Contact page. Business and Enterprise customers also receive priority support.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-slate-50/70 border-y border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <HelpCircle className="size-3.5 text-emerald-600" />
            <span>Got Questions?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Everything you need to know about NX CRM, WhatsApp Cloud API compliance, team setup, and billing.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={cn(
                  'rounded-2xl border transition-all duration-200 overflow-hidden bg-white',
                  isOpen
                    ? 'border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 transition-colors"
                >
                  <span className="pr-4">{item.question}</span>
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-slate-400 transition-transform duration-200',
                      isOpen && 'rotate-180 text-emerald-600'
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in-50 duration-200">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
