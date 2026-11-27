import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCheck,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { siteConfig } from '@/lib/config/site';

/**
 * Landing hero — server component (no client JS, no timers).
 *
 * Layout follows the pattern used across WhatsApp-business platforms:
 * a value-led headline + two CTAs on the left, and a live-looking
 * product preview on the right. The preview is plain HTML/CSS, so it
 * renders instantly, stays sharp at any DPI, and costs zero image bytes
 * on the LCP path (the previous hero shipped a 1.4 MB PNG).
 */
export function HeroSection() {
  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM team! I would like a live demo of the WhatsApp CRM.',
  )}`;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15, 118, 110, 0.10) 1px, transparent 0)',
          backgroundSize: '26px 26px',
          maskImage: 'linear-gradient(to bottom, black, transparent 85%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-20">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            <BadgeCheck className="size-3.5 text-emerald-600" />
            Built on the official WhatsApp Business Cloud API
          </div>

          <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.6rem]">
            Sell, support & market on{' '}
            <span className="relative whitespace-nowrap text-emerald-600">
              WhatsApp
              <svg aria-hidden viewBox="0 0 220 12" className="absolute -bottom-1.5 left-0 h-2.5 w-full text-emerald-300" preserveAspectRatio="none">
                <path d="M2 9c55-7 158-9 216-3" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>{' '}
            — from one team inbox
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
            NX CRM gives your whole team one WhatsApp number, a shared inbox, broadcast campaigns,
            no-code chatbot flows and AI replies — so no lead waits and no customer slips through.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98] sm:w-auto"
            >
              Start free — no card needed
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-emerald-400 hover:bg-emerald-50 sm:w-auto"
            >
              <MessageCircle className="size-4 text-emerald-600" />
              Book a WhatsApp demo
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600 lg:justify-start">
            {['Free plan to start', 'Instant Cloud API connect', 'Zero per-message markup'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>

          <dl className="mx-auto mt-10 grid max-w-lg grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/80 py-4 text-center shadow-sm lg:mx-0">
            {[
              { k: '1', v: 'Number, whole team' },
              { k: 'Live', v: 'Real-time inbox' },
              { k: '24/7', v: 'AI auto-replies' },
            ].map((s) => (
              <div key={s.v} className="px-2">
                <dt className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{s.k}</dt>
                <dd className="mt-0.5 text-xs font-medium text-slate-500">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div aria-hidden className="absolute -inset-6 -z-0 rounded-[2.5rem] bg-gradient-to-tr from-emerald-200/50 via-teal-100/40 to-sky-100/40 blur-2xl" />
          <HeroInboxPreview />

          <div className="absolute -left-6 bottom-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl shadow-slate-900/10 sm:flex">
            <div className="flex size-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">AI drafted a reply</p>
              <p className="text-[11px] text-slate-500">from your knowledge base</p>
            </div>
          </div>

          <div className="absolute -top-7 right-6 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl shadow-slate-900/10 sm:flex">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Send className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Campaign delivered</p>
              <p className="text-[11px] text-slate-500">12,480 sent · 71% read</p>
            </div>
          </div>
        </div>
      </div>

      <TrustStrip />
    </section>
  );
}

function HeroInboxPreview() {
  const chats = [
    { n: 'Priya Mehta', m: 'Is the blue kurta available in M?', t: '2m', u: 2, c: 'bg-rose-100 text-rose-700' },
    { n: 'Rahul Verma', m: 'Payment done ✅', t: '8m', u: 0, c: 'bg-sky-100 text-sky-700' },
    { n: 'Ayesha Khan', m: 'Can I reschedule to Friday?', t: '21m', u: 1, c: 'bg-amber-100 text-amber-700' },
    { n: 'Daniel Lee', m: 'Thanks for the quick help!', t: '1h', u: 0, c: 'bg-violet-100 text-violet-700' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
      {/* window bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-rose-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-[11px] font-medium text-slate-500">Team Inbox · NX CRM</span>
      </div>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        {/* list */}
        <div className="border-r border-slate-200">
          <div className="p-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] text-slate-500">
              <Search className="size-3.5" /> Search chats
            </div>
            <div className="mt-2 flex gap-1 text-[10px] font-semibold">
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-white">Open</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">Mine</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">Resolved</span>
            </div>
          </div>
          <ul>
            {chats.map((c, i) => (
              <li key={c.n} className={`flex items-center gap-2 px-2.5 py-2 ${i === 0 ? 'bg-emerald-50' : ''}`}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${c.c}`}>
                  {c.n.split(' ').map((p) => p[0]).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[11.5px] font-semibold text-slate-900">{c.n}</p>
                    <span className="text-[9.5px] text-slate-400">{c.t}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[10.5px] text-slate-500">{c.m}</p>
                    {c.u > 0 && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">{c.u}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* thread */}
        <div className="flex min-h-[300px] flex-col bg-[#efeae2] sm:min-h-[340px]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-slate-900">Priya Mehta</p>
              <p className="flex items-center gap-1 text-[10px] text-emerald-700">
                <Clock3 className="size-3" /> 23h left in session
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              <Users className="size-3" /> Sales
            </span>
          </div>
          <div className="flex-1 space-y-2 p-3 text-[11.5px] leading-snug">
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-slate-800 shadow-sm">
              Hi! Is the blue kurta available in M? 👗
              <span className="ml-2 text-[9px] text-slate-400">10:42</span>
            </div>
            <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 py-1.5 text-slate-800 shadow-sm">
              Yes, it&apos;s in stock! Shall I reserve one for you?
              <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] text-slate-500">
                10:43 <CheckCheck className="size-3 text-sky-500" />
              </span>
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-slate-800 shadow-sm">
              Please do 🙏 how do I pay?
              <span className="ml-2 text-[9px] text-slate-400">10:44</span>
            </div>
            <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-slate-800">
              <span className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-violet-700">
                <Bot className="size-3" /> AI suggestion
              </span>
              Here&apos;s your secure payment link: pay.nxcrm.online/…
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-2">
            <div className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-400">Type / for quick replies…</div>
            <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Send className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, t: 'Anti-ban pacing & opt-out guard' },
    { icon: Zap, t: 'Real-time webhooks' },
    { icon: Users, t: 'Multi-agent shared inbox' },
    { icon: Bot, t: 'Bring-your-own-key AI' },
  ];
  return (
    <div className="relative border-y border-slate-200 bg-white/80">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 text-[13px] font-medium text-slate-600 sm:px-6 md:grid-cols-4 lg:px-8">
        {items.map(({ icon: Icon, t }) => (
          <li key={t} className="flex items-center justify-center gap-2 text-center">
            <Icon className="size-4 shrink-0 text-emerald-600" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
