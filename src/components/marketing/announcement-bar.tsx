'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';

const ANNOUNCEMENT_STORAGE_KEY = 'nxcrm_announcement_dismissed_v1';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
      if (!isDismissed) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-sm px-4 py-2 text-xs sm:text-sm font-medium transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span className="flex h-5 items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-2 text-[11px] font-semibold text-white">
            <Sparkles className="size-3 text-amber-300 shrink-0" />
            <span>Official Release</span>
          </span>
          <span className="text-white/95">
            NX CRM — Enterprise WhatsApp Cloud API v22.0, Flow Builder, AI auto-replies & Multi-Agent Inbox.
          </span>
          <Link
            href="/signup"
            className="hidden md:inline-flex items-center gap-1 font-bold text-white hover:text-amber-200 transition-colors underline underline-offset-4 decoration-white/70"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
