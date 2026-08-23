'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Crown,
  Receipt,
  MessageSquare,
  Inbox,
  Zap,
  GitBranch,
  Bot,
  Layers,
  Flag,
  BarChart3,
  ScrollText,
  Activity,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Platform Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Clients & Billing',
    items: [
      { label: 'Client Management', href: '/admin/clients', icon: Users },
      { label: 'Website Leads & Inquiries', href: '/admin/inquiries', icon: MessageSquare },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Subscription Plans', href: '/admin/plans', icon: Crown },
      { label: 'Payment Records', href: '/admin/payments', icon: Receipt },
    ],
  },
  {
    title: 'Communications',
    items: [
      { label: 'WhatsApp & APIs', href: '/admin/whatsapp', icon: MessageSquare },
      { label: 'Inbox Inspector', href: '/admin/inbox', icon: Inbox },
    ],
  },
  {
    title: 'Automations & AI',
    items: [
      { label: 'Automations', href: '/admin/automations', icon: Zap },
      { label: 'Flow Builder', href: '/admin/flows', icon: GitBranch },
      { label: 'AI & Agents', href: '/admin/ai', icon: Bot },
      { label: 'Integrations', href: '/admin/integrations', icon: Layers },
    ],
  },
  {
    title: 'System & Security',
    items: [
      { label: 'Feature Flags', href: '/admin/features', icon: Flag },
      { label: 'Logs Hub', href: '/admin/logs', icon: ScrollText },
      { label: 'System Health', href: '/admin/system-health', icon: Activity },
      { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
      { label: 'Admin Staff', href: '/admin/admin-users', icon: ShieldCheck },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col justify-between hidden md:flex h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border/80">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card">
              <ShieldAlert className="size-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-foreground tracking-tight">NX CRM</span>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 uppercase">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Nexora Spark Agency</p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="py-4 px-3 space-y-6 overflow-y-auto max-h-[calc(100vh-130px)] custom-scrollbar">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </div>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/25 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            'size-4 transition-colors',
                            isActive ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.2 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Live Server Pulse */}
      <div className="p-3 border-t border-border/80 bg-muted/20">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-card/60 border border-border/60 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-foreground">API v22.0 Live</span>
          </div>
          <Link href="/admin/system-health" className="text-muted-foreground hover:text-emerald-400 transition-colors">
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
