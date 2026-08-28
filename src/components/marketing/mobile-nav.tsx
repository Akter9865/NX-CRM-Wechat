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
  MessageCircle,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { siteConfig } from '@/lib/config/site';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isAuthenticated: boolean;
}

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [productExpanded, setProductExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const pathname = usePathname();

  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM Team! I want to know more about the WhatsApp CRM & Automation platform.'
  )}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xs sm:max-w-sm flex-col bg-white border-l border-slate-200 text-slate-900 p-4 sm:p-5 shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <BrandLogo size="sm" showBadge={false} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Links Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3.5 space-y-2.5 pr-1">
          {/* Product Accordion */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-1.5">
            <button
              type="button"
              onClick={() => setProductExpanded(!productExpanded)}
              className="flex w-full items-center justify-between p-2 text-xs font-bold text-slate-800 hover:text-slate-900"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-emerald-600" />
                <span>Product Suite</span>
              </div>
              <ChevronDown
                className={cn(
                  'size-3.5 text-slate-400 transition-transform duration-200',
                  productExpanded && 'rotate-180 text-emerald-600'
                )}
              />
            </button>

            {productExpanded && (
              <div className="mt-1 space-y-0.5 pl-3 border-l border-slate-200 text-xs">
                <Link
                  href="/features/whatsapp-crm"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span>WhatsApp CRM</span>
                </Link>
                <Link
                  href="/features/shared-inbox"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Users className="size-3.5 text-blue-600" />
                  <span>Shared Team Inbox</span>
                </Link>
                <Link
                  href="/features/automation"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Zap className="size-3.5 text-amber-600" />
                  <span>Visual Automations</span>
                </Link>
                <Link
                  href="/features/ai-agents"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Bot className="size-3.5 text-purple-600" />
                  <span>AI Reply & Agents</span>
                </Link>
                <Link
                  href="/features/lead-management"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <GitBranch className="size-3.5 text-teal-600" />
                  <span>Lead Pipelines</span>
                </Link>
                <Link
                  href="/features/whatsapp-commerce"
                  onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <span>Features Overview</span>
          </Link>

          <Link
            href="/integrations"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <span>Integrations</span>
          </Link>

          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <span>Pricing</span>
          </Link>

          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <span>Contact Us</span>
          </Link>

          {/* Resources Accordion */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-1.5">
            <button
              type="button"
              onClick={() => setResourcesExpanded(!resourcesExpanded)}
              className="flex w-full items-center justify-between p-2 text-xs font-bold text-slate-800 hover:text-slate-900"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-emerald-600" />
                <span>Resources & Legal</span>
              </div>
              <ChevronDown
                className={cn(
                  'size-3.5 text-slate-400 transition-transform duration-200',
                  resourcesExpanded && 'rotate-180 text-emerald-600'
                )}
              />
            </button>

            {resourcesExpanded && (
              <div className="mt-1 space-y-0.5 pl-3 border-l border-slate-200 text-xs">
                <Link
                  href="/docs"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <BookOpen className="size-3.5 text-emerald-600" />
                  <span>Docs & API Reference</span>
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <HelpCircle className="size-3.5 text-blue-600" />
                  <span>FAQ</span>
                </Link>
                <Link
                  href="/security"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ShieldCheck className="size-3.5 text-purple-600" />
                  <span>Security & Compliance</span>
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <PhoneCall className="size-3.5 text-amber-600" />
                  <span>Contact Sales & Demo</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Direct WhatsApp Support Card inside mobile drawer */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 mt-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold text-emerald-900">Direct WhatsApp Help</span>
            </div>
            <p className="text-[10px] text-emerald-700 leading-snug">
              Chat directly with our specialists in West Bengal, India.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-500 transition-colors"
            >
              <MessageCircle className="size-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Bottom Drawer Actions */}
        <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0 bg-white">
          {isAuthenticated ? (
            <Link href="/dashboard" onClick={() => setOpen(false)} className="block w-full">
              <Button
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="size-4" />
                <span>Open CRM Dashboard</span>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup" onClick={() => setOpen(false)} className="block w-full">
                <Button
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>

              <Link href="/login" onClick={() => setOpen(false)} className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  Log In to Workspace
                </Button>
              </Link>
            </>
          )}

          {/* Quick Hotline Footer text */}
          <div className="text-center pt-0.5 text-[10px] text-slate-500">
            Hotline: <a href={`tel:${siteConfig.phone}`} className="font-semibold text-slate-700 hover:underline">{siteConfig.phone}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
