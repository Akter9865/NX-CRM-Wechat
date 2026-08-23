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
  Kanban,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Lead Management & Sales Pipelines — WhatsApp CRM for Sales Teams',
  description:
    'Capture inbound leads from Click-to-WhatsApp ads, qualify contacts automatically with tags, and track deals across visual Kanban pipeline stages.',
};

export default function LeadManagementFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-teal-700 font-bold">Lead Pipelines</span>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800">
              <GitBranch className="size-3.5 text-teal-600" />
              <span>Full-Funnel Sales Engine</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Visual Pipelines for{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 bg-clip-text text-transparent">
                WhatsApp Deals
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Track customer opportunities from first message to signed deal. Drag and drop deals across custom stages, assign revenue values, and automatically follow up with unengaged prospects.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/signup">
                <Button className="h-12 px-7 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2">
                  <span>Start Tracking Leads</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
              <Image
                src="/images/marketing/lead-generation.png"
                alt="Lead Generation and Interactive Flow Capture"
                width={600}
                height={480}
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Kanban className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Custom Deal Stages</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create pipeline stages tailored to your business model: New Lead, Qualified, Demo Scheduled, Proposal Sent, and Won/Lost.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <FileSpreadsheet className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">CSV Import & Export</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bulk import existing contact databases via CSV with automatic field mapping and phone deduplication.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Zap className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Stage-Change Triggers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatically trigger visual automation flows (such as sending a payment link or alert email) whenever a deal enters a new stage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
