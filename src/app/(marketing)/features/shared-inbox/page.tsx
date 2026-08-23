import Link from 'next/link';
import {
  Users,
  Clock,
  Lock,
  MessageSquare,
  Sparkles,
  CheckCheck,
  Tag,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Multi-Agent Shared Inbox — Team Collaboration for WhatsApp',
  description:
    'Collaborate with your sales, support, and billing teams in one unified WhatsApp shared inbox. Chat assignment, private internal notes, and 24-hour service timers.',
};

export default function SharedInboxFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-blue-700 font-bold">Shared Inbox</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
            <Users className="size-3.5 text-blue-600" />
            <span>Team Collaboration</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            One WhatsApp Inbox for Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Entire Team
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Eliminate communication bottlenecks. Invite agents with role-based permissions, assign conversations, leave internal private notes, and resolve queries collaboratively.
          </p>

          <div className="pt-2">
            <Link href="/signup">
              <Button className="h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 mx-auto">
                <span>Start Using Shared Inbox</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <UserCheck className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Smart Assignment & Queues</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Auto-route chats to available agents or allow team members to claim unassigned conversations from the shared backlog.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">24h Customer Service Window</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visual timer alerts agents to reply before Meta’s 24-hour free-form session expires, preventing missed customer interactions.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Lock className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Private Internal Notes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tag colleagues and store internal context directly within the customer’s thread without exposing private notes to the client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
