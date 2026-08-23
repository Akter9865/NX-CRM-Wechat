import Link from 'next/link';
import Image from 'next/image';
import {
  GitBranch,
  ArrowRight,
  Filter,
  CheckCircle2,
  Tag,
  UserPlus,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const FUNNEL_STAGES = [
  { name: 'Lead', desc: 'Click-to-WhatsApp Ads, QR codes, or website forms' },
  { name: 'Contact', desc: 'Auto-saved phone, name & metadata in CRM database' },
  { name: 'Conversation', desc: 'Realtime dialogue in Shared Inbox with agent assignment' },
  { name: 'Automation', desc: 'Qualifying questions & automated data enrichment' },
  { name: 'Deal Stage', desc: 'Visual Kanban pipeline with custom deal values' },
  { name: 'Customer', desc: 'Converted paying client with complete history' },
];

export function LeadManagementSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy & Funnel Flow */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800">
              <GitBranch className="size-3.5 text-teal-600" />
              <span>Full-Funnel Sales Engine</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Capture, Qualify and{' '}
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Convert Leads
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Every message is a potential deal. Capture inbound leads directly from Meta ads or website buttons, qualify them automatically with WhatsApp Flows and tags, and track them across visual pipeline stages until closed.
            </p>

            {/* Visual Funnel Pathway */}
            <div className="space-y-2.5 pt-2">
              {FUNNEL_STAGES.map((stage, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-extrabold text-[10px]">
                    0{idx + 1}
                  </span>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-900">{stage.name}</span>
                    <span className="text-[11px] text-slate-500">{stage.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link href="/features/lead-management">
                <Button className="h-11 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-6 shadow-md shadow-teal-600/20 flex items-center gap-2">
                  <span>Explore Lead Pipelines</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Supplied Lead Generation Image */}
          <div className="relative">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-xl">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-teal-500/15 to-emerald-500/15 blur-xl -z-10" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src="/images/marketing/lead-generation.png"
                  alt="Click to WhatsApp Ads Lead Generation and Interactive Form Capture"
                  width={600}
                  height={500}
                  className="w-full h-auto object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
