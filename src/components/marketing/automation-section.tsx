import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  GitBranch,
  Bot,
  MessageSquare,
  Clock,
  UserCheck,
  CheckCircle2,
  Sliders,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const WORKFLOW_STEPS = [
  {
    step: '1',
    type: 'Trigger',
    title: 'Inbound Message Received',
    desc: 'Triggers when a customer messages with keyword "PRICE" or clicks a sponsored ad.',
    icon: Zap,
    color: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    step: '2',
    type: 'Condition',
    title: 'Check Contact Status & Tag',
    desc: 'If contact is already a Customer vs New Lead.',
    icon: GitBranch,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    step: '3',
    type: 'AI Node',
    title: 'Generate Intelligent Draft',
    desc: 'AI analyzes conversation intent and extracts requirements.',
    icon: Bot,
    color: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  {
    step: '4',
    type: 'Action',
    title: 'Send WhatsApp Interactive Menu',
    desc: 'Dispatches instant reply with quick reply buttons or catalog link.',
    icon: MessageSquare,
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    step: '5',
    type: 'Delay',
    title: 'Wait 15 Minutes',
    desc: 'Pauses execution before follow-up sequence kicks in.',
    icon: Clock,
    color: 'border-teal-200 bg-teal-50 text-teal-700',
  },
  {
    step: '6',
    type: 'Action',
    title: 'Assign to Senior Sales Agent',
    desc: 'Routes qualified opportunity directly to assigned team member.',
    icon: UserCheck,
    color: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
];

export function AutomationSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800">
            <Zap className="size-3.5 text-amber-600" />
            <span>Drag-and-Drop Workflow Engine</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Build Automation{' '}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Visually
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Automate customer journeys from first touch to closed deal. Create multi-branch flows with triggers, conditions, delays, AI reasoning, message templates, CRM updates, and external webhooks.
          </p>
        </div>

        {/* Visual Workflow Steps Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Step 0{step.step} • {step.type}
                  </span>
                  <div className={`flex size-9 items-center justify-center rounded-xl border ${step.color}`}>
                    <Icon className="size-4.5" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Feature Badges & CTA */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mb-8">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            <CheckCircle2 className="size-3.5 text-amber-600" />
            <span>Keyword & Ad Triggers</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            <CheckCircle2 className="size-3.5 text-amber-600" />
            <span>Dynamic Delays & Cron</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            <CheckCircle2 className="size-3.5 text-amber-600" />
            <span>Outbound Webhook Webhooks</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            <CheckCircle2 className="size-3.5 text-amber-600" />
            <span>CRM Field & Tag Updates</span>
          </div>
        </div>

        <div className="text-center">
          <Link href="/features/automation">
            <Button className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-6 shadow-md shadow-amber-600/20 inline-flex items-center gap-2">
              <span>Explore Visual Automation</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
