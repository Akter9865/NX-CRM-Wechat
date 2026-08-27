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
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SharedInboxSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy & Value Proposition */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
              <Users className="size-3.5 text-blue-600" />
              <span>Multi-Agent Collaboration</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              One Shared Inbox for Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Customer Conversations
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Stop passing one physical company phone around the office. Connect your WhatsApp Business number to NX CRM and let your entire sales, support, and billing team manage incoming customer queries simultaneously.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Role-Based Team Assignment</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Assign chats to specific agents (Owner, Admin, Agent, Viewer) with fine-grained multi-tenant access controls.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">24-Hour Messaging Window Timer</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Live visual countdown indicator helps your agents reply within Meta’s 24-hour customer service window or switch seamlessly to verified templates.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-xs">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Private Internal Team Notes</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Leave internal notes inside conversation threads that are only visible to your teammates, never sent to the customer.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/features/shared-inbox">
                <Button className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-6 shadow-md shadow-blue-600/20 flex items-center gap-2">
                  <span>See Shared Inbox</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Realistic Interactive Inbox UI Component */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl space-y-4 hover-lift">
              {/* Inbox Mock Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    RS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Rohan Sharma</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                        Active Now
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate max-w-[200px] sm:max-w-none">+91 98765 43210 • Assigned to Sarah Jenkins</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-medium self-start sm:self-auto shrink-0">
                  <Clock className="size-3 text-amber-600" />
                  <span>21h 45m left in 24h window</span>
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="space-y-3 py-2 text-xs">
                {/* Customer Inbound */}
                <div className="flex flex-col items-start max-w-[80%]">
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-slate-800 border border-slate-200 leading-relaxed shadow-sm">
                    Hi NX CRM team! We want to integrate WhatsApp Cloud API for our 12 sales agents. Does your Business plan support multi-agent assignment?
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 pl-1">10:42 AM</span>
                </div>

                {/* Internal Note Banner */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                  <Lock className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950">Internal Note (Sarah Jenkins): </span>
                    High intent lead from Bangalore. Qualified for Business Plan (7,000 contacts).
                  </div>
                </div>

                {/* Agent Outbound Response */}
                <div className="flex flex-col items-end max-w-[80%] ml-auto">
                  <div className="rounded-2xl rounded-tr-sm bg-emerald-600 p-3 text-white leading-relaxed shadow-md shadow-emerald-600/20">
                    Hello Rohan! Yes, absolutely. Our Business plan supports multi-agent logins, shared inbox assignment, and visual automation flows. I can share our live onboarding link!
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 pr-1">
                    <span>10:44 AM</span>
                    <CheckCheck className="size-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Composer mockup */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-500">
                  Type a reply or press &apos;/&apos; for Quick Templates...
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                    <Sparkles className="size-3 text-purple-600" />
                    <span>AI Draft</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
