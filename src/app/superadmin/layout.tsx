import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, Database } from 'lucide-react';
import { SuperAdminLogoutButton } from '@/components/superadmin/logout-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Super Admin Portal — NX CRM',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top SuperAdmin Executive Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card">
                <ShieldAlert className="size-4 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                NX CRM
              </span>
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Super Admin
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-border/60 text-xs text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-foreground">Master Control Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Database className="size-3.5" />
            <span>Go to User App</span>
          </Link>

          <SuperAdminLogoutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>

      {/* SuperAdmin Executive Footer */}
      <footer className="w-full border-t border-border/70 bg-card/40 py-4 px-4 sm:px-8 text-xs text-muted-foreground mt-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">NX CRM Master SuperAdmin</span>
            <span className="text-muted-foreground/40">•</span>
            <span>Developed & Managed by <strong className="text-foreground">Nexora Spark Agency</strong></span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Nexora Spark Agency. All rights reserved. (Commercial SaaS License)
          </div>
        </div>
      </footer>
    </div>
  );
}
