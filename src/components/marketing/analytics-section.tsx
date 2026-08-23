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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const METRIC_CARDS = [
  {
    title: 'First Response Time (FRT)',
    desc: 'Measure how fast your team acknowledges inbound WhatsApp messages.',
    icon: Clock,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  {
    title: 'Conversation Volume & Trends',
    desc: 'Monitor incoming vs outgoing messages by hour, day, and active campaigns.',
    icon: MessageSquare,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    title: 'Resolution & Closed Conversations',
    desc: 'Track ticket resolution rates and customer satisfaction handoffs.',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: 'Agent & Team Performance',
    desc: 'Audit individual agent response speed, open chat load, and closing ratios.',
    icon: Users,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    title: 'Pipeline Deal Velocity',
    desc: 'Understand conversion rates from inbound lead to closed won customer.',
    icon: TrendingUp,
    color: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    title: 'Automation Trigger Execution',
    desc: 'Inspect workflow success rates, webhook deliveries, and AI draft usage.',
    icon: Zap,
    color: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200',
  },
];

export function AnalyticsSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-800">
            <BarChart3 className="size-3.5 text-indigo-600" />
            <span>Operational Insights</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Understand Your{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
              Customer Conversations
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Gain complete visibility into your support responsiveness, sales agent velocity, and messaging quotas with real-time CRM dashboards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {METRIC_CARDS.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200"
              >
                <div className={`flex size-10 items-center justify-center rounded-xl border ${metric.iconBg} mb-4`}>
                  <Icon className={`size-5 ${metric.color}`} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{metric.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{metric.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/features/analytics">
            <Button className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 shadow-md shadow-indigo-600/20 inline-flex items-center gap-2">
              <span>Explore Analytics & Reports</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
