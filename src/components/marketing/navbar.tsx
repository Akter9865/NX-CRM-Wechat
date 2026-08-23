'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown,
  MessageSquare,
  Users,
  Zap,
  Bot,
  GitBranch,
  ShoppingBag,
  BarChart3,
  BookOpen,
  HelpCircle,
  PhoneCall,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-200',
        scrolled
          ? 'border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-sm'
          : 'border-b border-slate-100 bg-white/80 backdrop-blur-md'
      )}
    >
      <div className="max-w-7xl mx-auto flex h-18 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 p-0.5 shadow-md shadow-emerald-600/20 transition-transform duration-200 group-hover:scale-105">
            <div className="flex size-full items-center justify-center rounded-[10px] bg-white">
              <span className="font-extrabold text-lg tracking-tighter bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                NX
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                NX CRM
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                WhatsApp
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 tracking-wide">
              Powered by Nexora Spark Agency
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Product Dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/80"
            >
              <span>Product</span>
              <ChevronDown className="size-4 text-slate-400 transition-transform duration-200 group-hover:rotate-180 group-hover:text-slate-700" />
            </button>

            {/* Mega Dropdown Menu */}
            <div className="invisible absolute top-full left-0 w-[540px] pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop-blur-2xl grid grid-cols-2 gap-2">
                <Link
                  href="/features/whatsapp-crm"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 group-hover/item:scale-105 transition-transform">
                    <MessageSquare className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-emerald-700 transition-colors">
                      WhatsApp Cloud CRM
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Official Meta API sync, chat history, tags & contacts.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/features/shared-inbox"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 group-hover/item:scale-105 transition-transform">
                    <Users className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-blue-700 transition-colors">
                      Shared Team Inbox
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Multi-agent assignment, private notes & 24h window.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/features/automation"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600 group-hover/item:scale-105 transition-transform">
                    <Zap className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-amber-700 transition-colors">
                      Visual Workflow Builder
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Triggers, conditions, auto-replies, delays & webhooks.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/features/ai-agents"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 border border-purple-200 text-purple-600 group-hover/item:scale-105 transition-transform">
                    <Bot className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-purple-700 transition-colors">
                      AI Auto-Replies & Agents
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Gemini / OpenAI smart drafts, summaries & handoff.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/features/lead-management"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 group-hover/item:scale-105 transition-transform">
                    <GitBranch className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-indigo-700 transition-colors">
                      Lead Pipelines & Deals
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Drag-and-drop Kanban pipeline for sales opportunities.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/features/whatsapp-commerce"
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 hover:bg-slate-50 group/item"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600 group-hover/item:scale-105 transition-transform">
                    <ShoppingBag className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover/item:text-rose-700 transition-colors">
                      WhatsApp Commerce
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Catalogs, Razorpay checkout links & order updates.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/features"
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/80"
          >
            Features
          </Link>

          <Link
            href="/integrations"
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/80"
          >
            Integrations
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/80"
          >
            Pricing
          </Link>

          {/* Resources Dropdown */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:bg-slate-100/80"
            >
              <span>Resources</span>
              <ChevronDown className="size-4 text-slate-400 transition-transform duration-200 group-hover:rotate-180 group-hover:text-slate-700" />
            </button>

            <div className="invisible absolute top-full left-0 w-64 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl backdrop-blur-2xl space-y-1">
                <Link
                  href="/docs"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <BookOpen className="size-4 text-emerald-600" />
                  <span>Documentation & Guides</span>
                </Link>
                <Link
                  href="/faq"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <HelpCircle className="size-4 text-blue-600" />
                  <span>Frequently Asked Questions</span>
                </Link>
                <Link
                  href="/security"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <ShieldCheck className="size-4 text-purple-600" />
                  <span>Meta Security & Compliance</span>
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <PhoneCall className="size-4 text-amber-600" />
                  <span>Sales & Direct Contact</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <LayoutDashboard className="size-3.5" />
                <span>Open Dashboard</span>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  className="h-10 px-4 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs"
                >
                  Log In
                </Button>
              </Link>

              <Link href="/signup">
                <Button
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Navigation Hamburger */}
          <MobileNav isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </header>
  );
}
