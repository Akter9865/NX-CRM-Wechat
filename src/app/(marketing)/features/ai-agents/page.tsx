import Link from 'next/link';
import {
  Bot,
  Sparkles,
  FileText,
  BookOpen,
  UserCheck,
  Languages,
  Target,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'AI Auto-Replies & Agents — Google Gemini & OpenAI Integration',
  description:
    'Augment your WhatsApp CRM with Bring-Your-Own-Key AI. Smart reply suggestions, thread summarization, and RAG knowledge base answers.',
};

export default function AiAgentsFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-purple-700 font-bold">AI & Agents</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-800">
            <Bot className="size-3.5 text-purple-600" />
            <span>BYOK Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            AI Grounded in Your{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Business Data
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Connect Google Gemini or OpenAI with your own API key. AI assists human agents with high-accuracy drafts, thread summaries, and RAG knowledge retrieval without halluncinations.
          </p>

          <div className="pt-2">
            <Link href="/signup">
              <Button className="h-12 px-7 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 mx-auto">
                <span>Start with AI Assistance</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Feature Deep Dive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Sparkles className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Contextual Reply Suggestions</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a customer asks a question, AI analyzes the last 20 conversation messages and generates a polite, accurate response that agents can edit and send in one click.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <BookOpen className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">RAG Knowledge Base</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload company documents, pricing FAQs, and product sheets. Full-text and vector search retrieve exact clauses so answers are 100% grounded in your facts.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileText className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">One-Click Thread Summarization</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When reassigning a customer thread to a manager or specialist, click Summarize to get a concise 3-bullet briefing of the customer’s issue and needs.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <UserCheck className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Graceful Human Handoff</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI flags complex, high-urgency, or ambiguous questions and routes them directly to human agents, preventing awkward chatbot loops.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
