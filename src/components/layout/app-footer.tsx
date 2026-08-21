'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppFooter({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'mt-auto w-full border-t border-border/60 bg-background/50 backdrop-blur-xs py-4 px-4 sm:px-6 text-xs text-muted-foreground transition-colors',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Product & Agency Branding */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="font-semibold text-foreground tracking-tight">
            NX CRM Enterprise
          </span>
          <span className="text-muted-foreground/40 font-mono">•</span>
          <span className="flex items-center gap-1 font-medium">
            <span>Crafted & Powered by</span>
            <span className="font-bold text-foreground bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              Nexora Spark Agency
            </span>
          </span>
        </div>

        {/* Center/Right: Security badge & Copyright */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 flex-wrap justify-center">
          <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
            <Shield className="size-3 text-emerald-400 shrink-0" />
            <span>Enterprise Encrypted</span>
          </div>
          <span className="text-muted-foreground/30 font-mono hidden sm:inline">•</span>
          <span className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 font-medium">
            Commercial SaaS License
          </span>
          <span className="text-muted-foreground/30 font-mono hidden sm:inline">•</span>
          <span>© {currentYear} Nexora Spark Agency. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
