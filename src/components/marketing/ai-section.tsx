import Link from 'next/link';
import {
  Bot,
  Sparkles,
  FileText,
  Languages,
  Target,
  SmilePlus,
  BookOpen,
  UserCheck,
  ArrowRight,
  BadgeAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function AiSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-800">
            <Bot className="size-3.5 text-purple-600" />
            <span>BYOK AI Intelligence</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {AI_CAPABILITIES.map((item, idx) => {
            const Icon = item.icon;
            const isAvailable = item.status === 'Available';
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm hover:border-purple-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex size-10 items-center justify-center rounded-xl border ${item.iconBg}`}>
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

                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/features/ai-agents">
            <Button className="h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-6 shadow-md shadow-purple-600/20 inline-flex items-center gap-2">
              <span>Explore AI Capabilities</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
