import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Zap,
  Bot,
  GitBranch,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const WHY_CARDS = [
  {
    icon: MessageSquare,
    title: 'WhatsApp CRM',
    description: 'Centralize conversations, customer data, notes, and tags in one unified workspace.',
    href: '/features/whatsapp-crm',
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    icon: Users,
    title: 'Shared Inbox',
    description: 'Manage customer conversations with your team, assign chats, and collaborate with internal notes.',
    href: '/features/shared-inbox',
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    icon: Zap,
    title: 'Visual Automation',
    description: 'Build visual workflows to automate welcome messages, lead routing, and repetitive tasks.',
    href: '/features/automation',
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    icon: Bot,
    title: 'AI Intelligence',
    description: 'Use Gemini & OpenAI for smart reply suggestions, conversation summaries, and lead triage.',
    href: '/features/ai-agents',
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    icon: GitBranch,
    title: 'CRM & Pipelines',
    description: 'Track deals across customizable stages, organize contacts by tags, and follow up systematically.',
    href: '/features/lead-management',
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Track conversation volumes, agent response times, resolution rates, and automation metrics.',
    href: '/features/analytics',
    color: 'text-indigo-600',
    iconBg: 'bg-indigo-50 border-indigo-200',
  },
];

export function WhyNxCrm() {
  return (
    <section id="features" className="py-12 sm:py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Everything You Need to Manage{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Customer Conversations
            </span>
          </h2>
          <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
            Eliminate chaotic chat handoffs and missed messages. NX CRM unifies your WhatsApp messaging, CRM contacts, and automated workflows into one cohesive engine.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {WHY_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                href={card.href}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300"
              >
                <div>
                  <div className={`flex size-11 sm:size-12 items-center justify-center rounded-2xl border ${card.iconBg} p-2.5 mb-4 sm:mb-6 shadow-sm`}>
                    <Icon className={`size-5 sm:size-6 ${card.color} transition-transform group-hover:scale-110`} />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-emerald-700 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                  <span>Explore {card.title}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
