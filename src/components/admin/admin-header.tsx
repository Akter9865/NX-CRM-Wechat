'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Database,
  LogOut,
  Bell,
  Search,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<{ fullName: string; role: string; email: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAdminUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      toast.success('Admin session ended');
      router.push('/admin/login');
    } catch {
      toast.error('Failed to log out');
    } finally {
      setLoggingOut(false);
    }
  };

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Executive Dashboard';
    if (pathname.startsWith('/admin/clients')) return 'Client Management';
    if (pathname.startsWith('/admin/inquiries')) return 'Website Leads & Public Inquiries';
    if (pathname.startsWith('/admin/subscriptions')) return 'Subscription Lifecycle';
    if (pathname.startsWith('/admin/plans')) return 'Database Subscription Plans';
    if (pathname.startsWith('/admin/payments')) return 'Payment Records & Receipts';
    if (pathname.startsWith('/admin/whatsapp')) return 'WhatsApp & API Infrastructure';
    if (pathname.startsWith('/admin/inbox')) return 'Multi-Tenant Inbox Inspector';
    if (pathname.startsWith('/admin/automations')) return 'Automations Inspector';
    if (pathname.startsWith('/admin/flows')) return 'Visual Flow Builder Inspector';
    if (pathname.startsWith('/admin/ai')) return 'AI Agents & Model Consumption';
    if (pathname.startsWith('/admin/integrations')) return 'Integrations Ecosystem';
    if (pathname.startsWith('/admin/features')) return 'Dynamic Feature Flags';
    if (pathname.startsWith('/admin/analytics')) return 'Platform Revenue & Growth Analytics';
    if (pathname.startsWith('/admin/logs')) return 'Searchable Logs Hub';
    if (pathname.startsWith('/admin/system-health')) return 'Real-Time System Diagnostics';
    if (pathname.startsWith('/admin/settings')) return 'Global Platform Settings';
    if (pathname.startsWith('/admin/admin-users')) return 'Admin Personnel & RBAC';
    return 'Admin Control Center';
  };

  return (
    <header className="h-16 border-b border-border/80 bg-card/70 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
        >
          <Database className="size-3.5" />
          <span>Switch to CRM App</span>
        </Link>

        {adminUser && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border/80 text-xs">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
              {adminUser.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="font-bold text-foreground leading-none">{adminUser.fullName}</div>
              <div className="text-[10px] text-emerald-400 uppercase font-semibold mt-0.5">
                {adminUser.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={loggingOut}
          onClick={handleLogout}
          className="h-8 rounded-xl border-border bg-card text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 text-xs flex items-center gap-1.5"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
