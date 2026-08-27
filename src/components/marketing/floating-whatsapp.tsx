'use client';

import { useState } from 'react';
import { siteConfig } from '@/lib/config/site';
import { MessageCircle, X } from 'lucide-react';

export function FloatingWhatsApp() {
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM Team! I want to know more about the WhatsApp CRM & Automation platform.'
  )}`;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-7 sm:right-7 z-40 flex items-end gap-2.5 flex-col select-none">
      {/* Interactive Tooltip Card */}
      {!tooltipDismissed && (
        <div className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-900/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 transition-colors"
          >
            Chat with our WhatsApp Experts
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTooltipDismissed(true);
            }}
            aria-label="Dismiss tooltip"
            className="text-slate-400 hover:text-slate-600 ml-1 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Floating Action Button with Pulse Beacon */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="relative group flex size-12 sm:size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/35 hover:bg-emerald-500 hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse-ring"
      >
        {/* Active Online Green Dot */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white" />
        </span>

        <MessageCircle className="size-6 sm:size-7 text-white fill-white/10 group-hover:scale-110 transition-transform" />
      </a>
    </div>
  );
}
