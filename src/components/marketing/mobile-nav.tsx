'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
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
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isAuthenticated: boolean;
}

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [productExpanded, setProductExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Navigation Menu"
        className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in-50"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white border-l border-slate-200 text-slate-900 p-6 shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20">
              NX
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                NX CRM
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Cloud API
                </span>
              </div>
              <p className="text-[10px] text-slate-500">By Nexora Spark Agency</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Links Navigation */}
        <div className="flex-1 overflow-y-auto py-6 space-y-3">
          {/* Product Accordion */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
            <button
              type="button"
              onClick={() => setProductExpanded(!productExpanded)}
              className="flex w-full items-center justify-between p-2 text-sm font-bold text-slate-800 hover:text-slate-900"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-emerald-600" />
                <span>Product Suite</span>
              </div>
              <ChevronDown
                className={cn(
                  'size-4 text-slate-400 transition-transform duration-200',
                  productExpanded && 'rotate-180 text-emerald-600'
                )}
              />
            </button>

            {productExpanded && (
              <div className="mt-2 space-y-1 pl-3 border-l border-slate-200 text-xs">
                <Link
                  href="/features/whatsapp-crm"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span>WhatsApp CRM</span>
                </Link>
                <Link
                  href="/features/shared-inbox"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Users className="size-3.5 text-blue-600" />
                  <span>Shared Team Inbox</span>
                </Link>
                <Link
                  href="/features/automation"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Zap className="size-3.5 text-amber-600" />
                  <span>Visual Automations</span>
                </Link>
                <Link
                  href="/features/ai-agents"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Bot className="size-3.5 text-purple-600" />
                  <span>AI Reply & Agents</span>
                </Link>
                <Link
                  href="/features/lead-management"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <GitBranch className="size-3.5 text-teal-600" />
                  <span>Lead Pipelines</span>
                </Link>
                <Link
                  href="/features/whatsapp-commerce"
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ShoppingBag className="size-3.5 text-rose-600" />
                  <span>WhatsApp Commerce</span>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/features"
            className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700"
          >
            <span>Features Overview</span>
          </Link>

          <Link
            href="/integrations"
            className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700"
          >
            <span>Integrations</span>
          </Link>

          <Link
            href="/pricing"
            className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700"
          >
            <span>Pricing</span>
          </Link>

          {/* Resources Accordion */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
            <button
              type="button"
              onClick={() => setResourcesExpanded(!resourcesExpanded)}
              className="flex w-full items-center justify-between p-2 text-sm font-bold text-slate-800 hover:text-slate-900"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-emerald-600" />
                <span>Resources & Legal</span>
              </div>
              <ChevronDown
                className={cn(
                  'size-4 text-slate-400 transition-transform duration-200',
                  resourcesExpanded && 'rotate-180 text-emerald-600'
                )}
              />
            </button>

            {resourcesExpanded && (
              <div className="mt-2 space-y-1 pl-3 border-l border-slate-200 text-xs">
                <Link
                  href="/docs"
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <BookOpen className="size-3.5 text-emerald-600" />
                  <span>Docs & API Reference</span>
                </Link>
                <Link
                  href="/faq"
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <HelpCircle className="size-3.5 text-blue-600" />
                  <span>FAQ</span>
                </Link>
                <Link
                  href="/security"
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ShieldCheck className="size-3.5 text-purple-600" />
                  <span>Security & Compliance</span>
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <PhoneCall className="size-3.5 text-amber-600" />
                  <span>Contact Sales</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Drawer Actions */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="block w-full">
              <Button
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="size-4" />
                <span>Open CRM Dashboard</span>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup" className="block w-full">
                <Button
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>

              <Link href="/login" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  Log In to Workspace
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
