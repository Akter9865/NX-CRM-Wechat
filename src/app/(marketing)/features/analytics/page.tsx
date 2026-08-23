import Link from 'next/link';
import {
  BarChart3,
  Clock,
  MessageSquare,
  Users,
  CheckCircle2,
  TrendingUp,
  Zap,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Analytics & Reporting — Conversation Speed & Agent Metrics',
  description:
    'Gain complete operational visibility into your WhatsApp CRM: First Response Time (FRT), conversation volume, agent workloads, and pipeline win rates.',
};

export default function AnalyticsFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-indigo-700 font-bold">Analytics</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-800">
            <BarChart3 className="size-3.5 text-indigo-600" />
            <span>Actionable Operational Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Data-Driven Insights for{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
              Customer Operations
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Measure agent productivity, response speed, and customer engagement. Spot support bottlenecks and optimize staffing during peak conversation hours.
          </p>

          <div className="pt-2">
            <Link href="/signup">
              <Button className="h-12 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 mx-auto">
                <span>View Analytics Dashboard</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Clock className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">First Response Time (FRT)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track median and average response speed across team members to maintain high customer satisfaction standards.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <MessageSquare className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Message Volumes & Quotas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitor monthly messaging capacity, active WhatsApp connections, and daily message traffic breakdown.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Users className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Agent Load & Resolution Rates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Audit open vs resolved conversations per agent to balance workload distribution across your organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
