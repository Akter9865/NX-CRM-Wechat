import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-slate-50/60 border-t border-slate-200/80">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-100/40 blur-[130px] rounded-full" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-white to-emerald-50/40 p-8 sm:p-14 text-center shadow-xl overflow-hidden">
          {/* Subtle Glow Ring */}
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-emerald-100/40 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-teal-100/40 blur-2xl pointer-events-none" />

          <div className="relative space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>Ready for Modern WhatsApp CRM?</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Ready to Turn Conversations{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                Into Growth?
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Start managing your customer conversations, segmented broadcasts, and automated workflows with NX CRM today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>

              <Link href="/pricing" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-13 px-8 rounded-2xl border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-sm transition-all"
                >
                  <span>Explore Pricing</span>
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Instant Setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Official Meta Cloud API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
