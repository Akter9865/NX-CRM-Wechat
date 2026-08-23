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
    <section className="border-y border-slate-200/80 bg-slate-50/70 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {TRUST_POINTS.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:border-emerald-300 transition-all duration-200"
              >
                <div className={`flex size-11 items-center justify-center rounded-xl border mb-3 ${point.color}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                  {point.label}
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
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
