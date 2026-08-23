'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  MoreVertical,
  Eye,
  Crown,
  Calendar,
  RotateCcw,
  Ban,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FullClientProfile } from '@/lib/admin/types';
import { toast } from 'sonner';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<FullClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected client for action modals
  const [selectedClient, setSelectedClient] = useState<FullClientProfile | null>(null);

  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState('pro');
  const [durationMonths, setDurationMonths] = useState('1');

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState('30');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('free');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchClients = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planFilter && planFilter !== 'all') params.set('plan', planFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/clients?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('[Fetch Clients Error]:', err);
      toast.error('Failed to load clients list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, planFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Handle Client Impersonation
  const handleImpersonate = async (client: FullClientProfile) => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: client.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impersonation failed');

      toast.success(`Entering dashboard as: ${client.name}`);
      window.location.href = data.redirectUrl || '/dashboard';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to impersonate';
      toast.error(msg);
    }
  };

  // Handle Plan Change
  const handleChangePlan = async () => {
    if (!selectedClient) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: targetPlanId,
          durationMonths: Number(durationMonths),
          status: 'active',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plan change failed');

      toast.success(data.message || 'Plan updated successfully');
      setPlanModalOpen(false);
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error changing plan';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Extend Subscription
  const handleExtendSub = async () => {
    if (!selectedClient) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_subscription',
          days: Number(extendDays),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend subscription');

      toast.success(data.message);
      setExtendModalOpen(false);
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error extending subscription';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Suspend / Reactivate
  const handleToggleSuspend = async (client: FullClientProfile) => {
    const isSuspended = client.status === 'suspended';
    const action = isSuspended ? 'reactivate' : 'suspend';

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      toast.success(data.message);
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update client status';
      toast.error(msg);
    }
  };

  // Handle Reset Usage
  const handleResetUsage = async (client: FullClientProfile) => {
    if (!confirm(`Reset message & automation usage for "${client.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_usage' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      toast.success(data.message);
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset usage';
      toast.error(msg);
    }
  };

  // Handle Delete Client
  const handleDeleteClient = async (client: FullClientProfile) => {
    const confirmed = prompt(
      `Type DELETE to permanently delete client account "${client.name}" and all associated data:`
    );
    if (confirmed !== 'DELETE') return;

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      toast.success('Client account permanently deleted');
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete client';
      toast.error(msg);
    }
  };

  // Handle Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          email: newClientEmail,
          planId: newClientPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');

      toast.success('Client account created successfully');
      setCreateModalOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      fetchClients(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create client';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Client Management
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Search, manage subscriptions, modify plans, inspect usage, or securely impersonate client accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => fetchClients()}
            className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add Client Account</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/80">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by client name, email, company, or account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={planFilter} onValueChange={(val) => setPlanFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free Tier</SelectItem>
              <SelectItem value="pro">Pro (₹499)</SelectItem>
              <SelectItem value="business">Business (₹3,000)</SelectItem>
              <SelectItem value="enterprise">Enterprise (₹8,999)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Name & Email</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Plan</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Contacts</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Messages (Mo)</TableHead>
                <TableHead className="text-xs font-bold text-foreground">WA Numbers</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Expiry Date</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading clients database...</span>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No clients found matching your search filters.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const isSuspended = client.status === 'suspended';
                  const isExpired = client.status === 'expired';

                  return (
                    <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Email */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{client.name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{client.email}</div>
                          <div className="text-[9px] font-mono text-muted-foreground/60">{client.id}</div>
                        </div>
                      </TableCell>

                      {/* Plan */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-bold text-[10px] uppercase tracking-wider ${
                            client.currentPlan.id === 'pro'
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                              : client.currentPlan.id === 'business'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : client.currentPlan.id === 'enterprise'
                              ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                              : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {client.currentPlan.name}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isSuspended
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : isExpired
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {client.status}
                        </span>
                      </TableCell>

                      {/* Contact Usage */}
                      <TableCell className="font-semibold text-foreground">
                        {client.usage.contactsCount.toLocaleString()}
                        {client.currentPlan.contactLimit && (
                          <span className="text-muted-foreground font-normal text-[10px] block">
                            / {client.currentPlan.contactLimit.toLocaleString()}
                          </span>
                        )}
                      </TableCell>

                      {/* Messages Usage */}
                      <TableCell className="font-semibold text-foreground">
                        {(client.usage.messagesSentThisMonth + client.usage.messagesReceivedThisMonth).toLocaleString()}
                        {client.currentPlan.monthlyMessageLimit && (
                          <span className="text-muted-foreground font-normal text-[10px] block">
                            / {client.currentPlan.monthlyMessageLimit.toLocaleString()}
                          </span>
                        )}
                      </TableCell>

                      {/* WA Numbers */}
                      <TableCell className="font-semibold text-foreground">
                        {client.usage.whatsappConnectionsCount}
                      </TableCell>

                      {/* Expiry Date */}
                      <TableCell className="text-muted-foreground text-[11px]">
                        {client.subscription?.expiryDate
                          ? new Date(client.subscription.expiryDate).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImpersonate(client)}
                            className="h-8 px-2.5 rounded-xl border-border bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center gap-1"
                            title="Login as Client"
                          >
                            <Eye className="size-3.5" />
                            <span>Impersonate</span>
                          </Button>

                          {/* Change Plan Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setTargetPlanId(client.currentPlan.id);
                              setPlanModalOpen(true);
                            }}
                            className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground text-xs"
                            title="Change Plan"
                          >
                            <Crown className="size-3.5 text-amber-400" />
                          </Button>

                          {/* Extend Subscription */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setExtendModalOpen(true);
                            }}
                            className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground text-xs"
                            title="Extend Subscription"
                          >
                            <Calendar className="size-3.5 text-blue-400" />
                          </Button>

                          {/* Reset Usage */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetUsage(client)}
                            className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground text-xs"
                            title="Reset Monthly Usage"
                          >
                            <RotateCcw className="size-3.5 text-purple-400" />
                          </Button>

                          {/* Suspend / Reactivate */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleSuspend(client)}
                            className={`h-8 px-2 rounded-xl border-border bg-card text-xs ${
                              isSuspended ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                          >
                            {isSuspended ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
                          </Button>

                          {/* Delete Account */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClient(client)}
                            className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 text-xs"
                            title="Delete Account"
                          >
                            <Trash2 className="size-3.5" />
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

      {/* Plan Change Modal */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Change Subscription Plan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Target Client: </span>
              <strong className="text-foreground">{selectedClient?.name}</strong>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Select New Plan</Label>
              <Select value={targetPlanId} onValueChange={(val) => setTargetPlanId(val || 'pro')}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Tier (₹0/mo - 10 Contacts, 200 Msgs)</SelectItem>
                  <SelectItem value="pro">Pro (₹499/mo - 1,000 Contacts, Unlimited Msgs)</SelectItem>
                  <SelectItem value="business">Business (₹3,000/mo - 7,000 Contacts, Broadcast, 5 WA)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (₹8,999/mo - Unlimited Scale)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Duration (Months)</Label>
              <Select value={durationMonths} onValueChange={(val) => setDurationMonths(val || '1')}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months (1 Year)</SelectItem>
                  <SelectItem value="24">24 Months (2 Years)</SelectItem>
                  <SelectItem value="60">60 Months (5 Years)</SelectItem>
                  <SelectItem value="1200">Lifetime Access (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setPlanModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleChangePlan}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {actionLoading ? 'Updating Plan...' : 'Apply Plan Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Modal */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Extend Subscription Validity
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-muted-foreground">Client: </span>
              <strong className="text-foreground">{selectedClient?.name}</strong>
              <span className="text-muted-foreground block mt-1">
                Current Expiry: {selectedClient?.subscription?.expiryDate ? new Date(selectedClient.subscription.expiryDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Days to Add</Label>
              <Select value={extendDays} onValueChange={(val) => setExtendDays(val || '30')}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (1 Week)</SelectItem>
                  <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                  <SelectItem value="30">30 Days (1 Month)</SelectItem>
                  <SelectItem value="60">60 Days (2 Months)</SelectItem>
                  <SelectItem value="90">90 Days (3 Months)</SelectItem>
                  <SelectItem value="365">365 Days (1 Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setExtendModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleExtendSub}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              {actionLoading ? 'Extending...' : 'Confirm Extension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Create New Client Account
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Client / Workspace Name *</Label>
              <Input
                placeholder="e.g. Apex Global Solutions"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Primary Owner Email *</Label>
              <Input
                type="email"
                placeholder="owner@apexsolutions.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Initial Plan Tier</Label>
              <Select value={newClientPlan} onValueChange={(val) => setNewClientPlan(val || 'free')}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Tier (₹0)</SelectItem>
                  <SelectItem value="pro">Pro (₹499/mo)</SelectItem>
                  <SelectItem value="business">Business (₹3,000/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (₹8,999/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {actionLoading ? 'Creating Account...' : 'Create Client Workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
