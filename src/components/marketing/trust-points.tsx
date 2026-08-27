import {
  MessageSquare,
  Users,
  Zap,
  Bot,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';

const TRUST_POINTS = [
  {
    icon: MessageSquare,
    label: 'WhatsApp Cloud API',
    description: 'Direct Meta integration with official API webhook reliability',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    icon: Users,
    label: 'Real-time Shared Inbox',
    description: 'Multi-agent assignment, private team notes & 24h timer',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    icon: Zap,
    label: 'Visual Automation',
    description: 'Drag-and-drop workflow builder with triggers, conditions & actions',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    icon: GitBranch,
    label: 'CRM & Pipelines',
    description: 'Visual Kanban boards, contact tags, custom fields & deal stages',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    icon: Bot,
    label: 'AI Assistance',
    description: 'Smart auto-drafts, conversation summaries & knowledge base',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    icon: ShieldCheck,
    label: 'Enterprise Security',
    description: 'Supabase Row-Level Security, tenant isolation & token encryption',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
];

export function TrustPoints() {
  return (
    <section className="border-y border-slate-200/80 bg-slate-50/70 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {TRUST_POINTS.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`flex size-10 sm:size-11 items-center justify-center rounded-xl border mb-2.5 ${point.color} group-hover:scale-110 transition-transform duration-300 shadow-2xs`}>
                  <Icon className="size-4.5 sm:size-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {point.label}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight line-clamp-2 sm:line-clamp-none">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
