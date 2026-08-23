'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  MessageSquare,
  Zap,
  Bot,
  TrendingUp,
  RefreshCw,
  Crown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Radio,
  GitBranch,
  ShieldCheck,
  ArrowRight,
  Activity,
  UserCheck,
  Ban,
  Receipt,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminOverviewStats } from '@/lib/admin/types';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('[Admin Stats Fetch Error]:', err);
      toast.error('Failed to load live admin metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            System Overview & Metrics
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time multi-tenant monitoring across all active accounts, WhatsApp connections, and revenue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => fetchStats()}
            className="h-9 rounded-xl border-border text-xs flex items-center gap-2 bg-card hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Live Data'}</span>
          </Button>

          <Link href="/admin/clients">
            <Button size="sm" className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5">
              <span>Manage Clients</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Core High-Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Clients</span>
            <Users className="size-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {loading ? '—' : stats?.totalClients || 0}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              {stats?.activeClients || 0} active
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/60">
            <span>Trial: {stats?.trialClients || 0}</span>
            <span>•</span>
            <span>Expired: {stats?.expiredClients || 0}</span>
            <span>•</span>
            <span>Suspended: {stats?.suspendedClients || 0}</span>
          </div>
        </div>

        {/* Monthly Revenue MRR */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue (MRR)</span>
            <TrendingUp className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {loading ? '—' : `₹${(stats?.monthlyRevenue || 0).toLocaleString('en-IN')}`}
            </span>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/60">
            <span>Pending: {stats?.pendingPayments || 0}</span>
            <span>•</span>
            <span className="text-rose-400">Failed: {stats?.failedPayments || 0}</span>
          </div>
        </div>

        {/* Total Messages */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Messages</span>
            <MessageSquare className="size-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {loading ? '—' : (stats?.totalMessages || 0).toLocaleString()}
            </span>
            <span className="text-xs text-purple-400 font-semibold">
              +{stats?.messagesToday || 0} today
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex items-center justify-between">
            <span>Active Chats: {stats?.activeConversations || 0}</span>
            <span>Contacts: {(stats?.totalContacts || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* WhatsApp Connections */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Numbers</span>
            <Radio className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {loading ? '—' : stats?.whatsappConnections || 0}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Cloud API v22.0</span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex items-center justify-between">
            <span>Flows: {stats?.activeFlows || 0}</span>
            <span>Auto: {stats?.activeAutomations || 0}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/admin/inquiries" className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-1 hover:bg-blue-500/15 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Website Leads & Inquiries</span>
            <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="text-xl font-extrabold text-white flex items-baseline gap-2">
            <span>{stats?.totalInquiries || 0}</span>
            {Boolean(stats?.newInquiries) && (
              <span className="text-xs text-blue-300 font-semibold">({stats?.newInquiries} new)</span>
            )}
          </div>
        </Link>
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Automations</span>
          <div className="text-xl font-bold text-foreground">{stats?.activeAutomations || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Flow Workflows</span>
          <div className="text-xl font-bold text-foreground">{stats?.activeFlows || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiring in 7 Days</span>
          <div className="text-xl font-bold text-amber-400">{stats?.expiringSubscriptions || 0}</div>
        </div>
      </div>

      {/* Row 3: Plan Distribution & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Plan Distribution Breakdown */}
        <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Plan Distribution</h3>
            <Crown className="size-4 text-amber-400" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-400" />
                <span className="font-semibold text-foreground">Free Tier (₹0)</span>
              </div>
              <span className="font-bold text-foreground">{stats?.planCounts?.free || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-400" />
                <span className="font-semibold text-foreground">Pro Plan (₹499)</span>
              </div>
              <span className="font-bold text-foreground">{stats?.planCounts?.pro || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-foreground">Business Plan (₹3,000)</span>
              </div>
              <span className="font-bold text-foreground">{stats?.planCounts?.business || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-400" />
                <span className="font-semibold text-foreground">Enterprise Plan (₹8,999)</span>
              </div>
              <span className="font-bold text-foreground">{stats?.planCounts?.enterprise || 0}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/admin/plans" className="block w-full">
              <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs font-semibold">
                Manage Plans & Features
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-foreground">Recent Admin Actions & System Feed</h3>
            </div>
            <Link href="/admin/logs" className="text-xs text-emerald-400 hover:underline">
              View All Logs
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{act.action}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({act.targetType}: {act.targetId ? act.targetId.substring(0, 8) + '...' : 'general'})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      By <strong className="text-foreground">{act.adminEmail}</strong> ({act.adminRole})
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No recent administrative activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
