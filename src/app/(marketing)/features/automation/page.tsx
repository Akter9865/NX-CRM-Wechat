import Link from 'next/link';
import {
  Zap,
  GitBranch,
  Bot,
  MessageSquare,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Visual Workflow Builder — Drag-and-Drop WhatsApp Automations',
  description:
    'Design automated customer workflows with triggers, conditional logic, AI nodes, scheduled delays, CRM updates, and webhook actions.',
};

export default function AutomationFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-amber-700 font-bold">Visual Automation</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800">
            <Zap className="size-3.5 text-amber-600" />
            <span>Visual Workflow Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Automate WhatsApp Workflows{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
              Without Code
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Create automated customer journeys from welcome sequences to lead routing, consultation scheduling, and order notifications using an intuitive visual canvas.
          </p>

          <div className="pt-2">
            <Link href="/signup">
              <Button className="h-12 px-7 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 mx-auto">
                <span>Try Flow Builder Free</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Zap className="size-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Smart Triggers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inbound keyword matches, Click-to-WhatsApp ads, new contact creation, or tag updates.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <GitBranch className="size-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Branching Logic</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If/Else conditional rules based on contact attributes, business hours, and purchase tags.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Bot className="size-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">AI Processing Nodes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extract lead requirements, assess intent, and generate smart reply suggestions on the fly.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Webhook className="size-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Outbound Webhooks</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Push real-time payloads to Zapier, Make, custom ERPs, and internal webhooks securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
