'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Phone,
  Sparkles,
  Search,
  RefreshCw,
  Zap,
  Crown,
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  TrendingUp,
  Coins,
  MessageSquare,
  Bot,
  UserPlus,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ManualSubscriptionDialog,
  type ClientData,
} from '@/components/superadmin/manual-subscription-dialog';
import {
  ClientDetailsSheet,
  type DetailedClientData,
} from '@/components/superadmin/client-details-sheet';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SystemStats {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  paidClients: number;
  suspendedClients: number;
  totalUsers: number;
  mrr: number;
  todaysRevenue: number;
  monthlyRevenue: number;
  totalWhatsappNumbers: number;
  connectedWhatsappApis: number;
  failedApis: number;
  totalMessages: number;
  aiMessages: number;
  totalLeads: number;
  totalAccounts: number;
  totalWhatsappConnections: number;
  totalContacts: number;
  totalMessagesThisMonth: number;
  totalAutomationsThisMonth: number;
  planCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [clients, setClients] = useState<DetailedClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Sheets state
  const [selectedClientForSub, setSelectedClientForSub] = useState<ClientData | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);

  const [selectedClientForDetails, setSelectedClientForDetails] = useState<DetailedClientData | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch('/api/superadmin/stats'),
        fetch('/api/superadmin/clients'),
      ]);

      if (statsRes.status === 401 || clientsRes.status === 401) {
        window.location.href = '/superadmin/login';
        return;
      }

      const statsData = await statsRes.json();
      const clientsData = await clientsRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (clientsData.success) {
        setClients(clientsData.clients || []);
      }
    } catch (error) {
      console.error('[superadmin-fetch] error:', error);
      toast.error('Failed to load Super Admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Account ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenSubscriptionDialog = (client: DetailedClientData) => {
    setSelectedClientForSub(client);
    setSubDialogOpen(true);
  };

  const handleOpenDetails = (client: DetailedClientData) => {
    setSelectedClientForDetails(client);
    setDetailsSheetOpen(true);
  };

  // Filter clients locally
  const filteredClients = clients.filter((c) => {
    const matchSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.owner?.email && c.owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.owner?.fullName && c.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.whatsappConnections.some((w) => w.phoneNumber?.includes(searchTerm));

    const matchPlan = planFilter === 'all' || c.subscription.planId === planFilter;
    const matchStatus = statusFilter === 'all' || c.subscription.status === statusFilter;

    return matchSearch && matchPlan && matchStatus;
  });

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case 'enterprise':
        return (
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1 font-semibold uppercase text-[10px]">
            <Crown className="size-3" /> Enterprise
          </Badge>
        );
      case 'business':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1 font-semibold uppercase text-[10px]">
            <Building2 className="size-3" /> Business
          </Badge>
        );
      case 'pro':
        return (
          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 gap-1 font-semibold uppercase text-[10px]">
            <Zap className="size-3" /> Pro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border gap-1 font-semibold uppercase text-[10px]">
            <ShieldCheck className="size-3" /> Free
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] capitalize">
            ● Active
          </Badge>
        );
      case 'trialing':
        return (
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] capitalize">
            ● Trialing
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] capitalize">
            ● Paused
          </Badge>
        );
      case 'cancelled':
      case 'expired':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] capitalize">
            ● {status}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border text-[10px] capitalize">
            ● {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Client Accounts &amp; Plans</span>
            <span className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-mono text-primary">
              {clients.length} Tenants
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global tenant directory, usage monitoring, and manual plan upgrades &amp; extensions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 rounded-xl border-border bg-card hover:bg-muted font-medium text-xs shadow-sm"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. Client Ecosystem & Subscription Health (5 KPI Cards)     */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            <span>Client Ecosystem &amp; Subscription Health</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            {stats?.totalClients || 0} Total Tenants
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Clients */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Total Clients</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {stats ? (stats.totalClients ?? stats.totalAccounts).toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Registered Organizations</p>
          </div>

          {/* 2. Active Clients */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">Active Clients</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {stats ? stats.activeClients.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Healthy Active Accounts</p>
          </div>

          {/* 3. Trial Clients */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-cyan-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-400">Trial Clients</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-400">
              {stats ? stats.trialClients.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Evaluation Period</p>
          </div>

          {/* 4. Paid Clients */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-300">Paid Clients</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Crown className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-300">
              {stats ? stats.paidClients.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Pro / Biz / Enterprise</p>
          </div>

          {/* 5. Suspended Clients */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-red-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-red-400">Suspended Clients</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <Ban className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-400">
              {stats ? stats.suspendedClients.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Paused or Expired</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. Financial Performance & Revenue (3 KPI Cards)            */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Coins className="size-3.5 text-amber-400" />
            <span>Financial Performance &amp; Revenue</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Live Billing Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 6. MRR */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card/80 to-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                MRR (Monthly Recurring)
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                <Sparkles className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-300">
                {stats ? `₹${stats.mrr.toLocaleString()}` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total active client recurring subscription run-rate
            </p>
          </div>

          {/* 7. Today's Revenue */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/80 to-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Today&apos;s Revenue
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-300">
                {stats ? `₹${stats.todaysRevenue.toLocaleString()}` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">today</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Estimated daily revenue run-rate across tenants
            </p>
          </div>

          {/* 8. Monthly Revenue */}
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card/80 to-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Monthly Revenue
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                <Coins className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-300">
                {stats ? `₹${stats.monthlyRevenue.toLocaleString()}` : '—'}
              </span>
              <span className="text-xs text-muted-foreground">gross</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Current billing cycle total pipeline revenue
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. WhatsApp, AI & Infrastructure Health (6 KPI Cards)       */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Radio className="size-3.5 text-emerald-400" />
            <span>WhatsApp, AI &amp; Messaging Infrastructure</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Meta Cloud API V21</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 9. Total WhatsApp Numbers */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">WhatsApp Numbers</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Phone className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {stats ? stats.totalWhatsappNumbers.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Registered Numbers</p>
          </div>

          {/* 10. Connected WhatsApp APIs */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">Connected APIs</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {stats ? stats.connectedWhatsappApis.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Live Webhook Active</p>
          </div>

          {/* 11. Failed APIs */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-red-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-red-400">Failed APIs</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-400">
              {stats ? stats.failedApis.toLocaleString() : '0'}
            </div>
            <p className="text-[10px] text-muted-foreground">Requires Token Re-auth</p>
          </div>

          {/* 12. Total Messages */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-blue-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-400">Total Messages</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <MessageSquare className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-400">
              {stats ? stats.totalMessages.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Inbound &amp; Outbound</p>
          </div>

          {/* 13. AI Messages */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-purple-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-400">AI Messages</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Bot className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-400">
              {stats ? stats.aiMessages.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">Gemini Auto-Replies</p>
          </div>

          {/* 14. Total Leads */}
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-1.5 shadow-xs transition-all hover:border-teal-500/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-400">Total Leads</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                <UserPlus className="size-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-teal-400">
              {stats ? stats.totalLeads.toLocaleString() : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground">CRM Contacts</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/40 backdrop-blur p-4 rounded-2xl border border-border/80">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, email, account ID, or WhatsApp number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-muted/40 border-border text-sm placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Plan Filter */}
          <Select value={planFilter} onValueChange={(val) => setPlanFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl bg-muted/40 border-border text-xs">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free Plan</SelectItem>
              <SelectItem value="pro">Pro (₹499)</SelectItem>
              <SelectItem value="business">Business (₹3k)</SelectItem>
              <SelectItem value="enterprise">Enterprise (₹9k)</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl bg-muted/40 border-border text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || planFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setPlanFilter('all');
                setStatusFilter('all');
              }}
              className="h-10 text-xs rounded-xl text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Client Accounts Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Client / Organization</TableHead>
                <TableHead className="text-xs font-semibold">Account Owner</TableHead>
                <TableHead className="text-xs font-semibold">Plan &amp; Validity</TableHead>
                <TableHead className="text-xs font-semibold">WhatsApp Channels</TableHead>
                <TableHead className="text-xs font-semibold">Current Usage</TableHead>
                <TableHead className="text-right text-xs font-semibold pr-6">
                  Master Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/10" />
                  </TableRow>
                ))
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No clients found matching your filter</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search keywords or filter dropdowns.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const expiryStr = client.subscription.currentPeriodEnd
                    ? format(new Date(client.subscription.currentPeriodEnd), 'dd MMM yyyy')
                    : 'No Expiry';

                  return (
                    <TableRow
                      key={client.id}
                      className="border-border hover:bg-muted/30 transition-colors"
                    >
                      {/* 1. Client / Tenant Info */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <span>{client.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <span className="truncate max-w-[130px]" title={client.id}>
                              {client.id}
                            </span>
                            <button
                              onClick={(e) => copyToClipboard(client.id, e)}
                              className="hover:text-primary transition-colors"
                              title="Copy ID"
                            >
                              {copiedId === client.id ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                            <span className="text-[10px] text-muted-foreground/60">•</span>
                            <span className="text-[11px] text-muted-foreground font-sans">
                              {client.created_at
                                ? format(new Date(client.created_at), 'dd MMM yyyy')
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Owner & Team */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">
                            {client.owner?.fullName || '—'}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[170px]" title={client.owner?.email}>
                            {client.owner?.email || 'No email'}
                          </p>
                          <span className="inline-block text-[10px] text-muted-foreground font-medium">
                            {client.teamCount} Team Member{client.teamCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>

                      {/* 3. Subscription Plan & Validity */}
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {getPlanBadge(client.subscription.planId)}
                            {getStatusBadge(client.subscription.status)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                            <Calendar className="size-3 text-muted-foreground/70" />
                            <span>Exp: {expiryStr}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 4. WhatsApp Connections */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Phone className="size-3.5 text-emerald-400" />
                            <span>
                              {client.whatsappCount} Channel{client.whatsappCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {client.whatsappConnections[0] && (
                            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">
                              {client.whatsappConnections[0].phoneNumber || client.whatsappConnections[0].verifiedName || 'Linked'}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* 5. Usage stats */}
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Contacts:</span>
                            <span className="font-semibold text-foreground">
                              {client.usage.contactsCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Msgs:</span>
                            <span className="font-semibold text-foreground">
                              {client.usage.messagesSent.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 6. Action Buttons */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenDetails(client)}
                            variant="outline"
                            className="h-8 rounded-xl border-border bg-card text-xs hover:bg-muted font-medium"
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenSubscriptionDialog(client)}
                            className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm shadow-primary/20 hover:bg-primary/90"
                          >
                            <Sparkles className="size-3.5 mr-1" />
                            Upgrade / Plan
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Manual Subscription Override Modal */}
      <ManualSubscriptionDialog
        client={selectedClientForSub}
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        onSuccess={() => fetchData(true)}
      />

      {/* Client Full Metadata Slide-out Sheet */}
      <ClientDetailsSheet
        client={selectedClientForDetails}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onManageSubscription={(client) => {
          setSelectedClientForSub(client);
          setSubDialogOpen(true);
        }}
      />
    </div>
  );
}
