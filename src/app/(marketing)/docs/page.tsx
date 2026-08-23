import Link from 'next/link';
import { DOC_PAGES } from '@/lib/docs/docs-content';
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Code2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Documentation — NX CRM Technical Guides & API Reference',
  description:
    'Complete technical documentation and guides for NX CRM: Getting Started, Meta Cloud API connection, Shared Inbox, Automations, Templates, Billing, and Public REST API.',
};

export default function DocsHubPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
            <BookOpen className="size-3.5 text-blue-600" />
            <span>Developer & User Manual</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            NX CRM{' '}
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Documentation
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Everything you need to configure your WhatsApp Business connection, manage team inboxes, build visual automations, and integrate our REST APIs.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {DOC_PAGES.map((doc, idx) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/70 p-7 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {doc.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">0{idx + 1}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  {doc.tagline}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                <span>Read Documentation</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* API Help Banner */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-slate-50 to-teal-50 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
              <Code2 className="size-4" />
              <span>Public REST API</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Need to integrate custom software?</h3>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Explore our developer documentation for programmatic WhatsApp message sending, contact updates, and real-time webhook subscriptions.
            </p>
          </div>

          <Link href="/docs/api">
            <Button className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 shadow-md">
              View API Reference
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
