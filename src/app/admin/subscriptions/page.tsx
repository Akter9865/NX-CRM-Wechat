'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Crown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
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
import { toast } from 'sonner';

interface SubscriptionItem {
  id: string;
  accountId: string;
  accountName: string;
  ownerEmail: string;
  ownerName: string;
  planId: string;
  planName: string;
  planPrice: number;
  status: string;
  startDate: string;
  expiryDate: string;
  gracePeriodEnd: string | null;
  razorpaySubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  notes: string | null;
  createdAt: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const fetchSubscriptions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter && planFilter !== 'all') params.set('plan', planFilter);

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error('[Fetch Subscriptions Error]:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, planFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSubscriptions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Subscription Lifecycle Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor client subscription lifecycles, grace periods, Razorpay IDs, and renewal expirations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchSubscriptions()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/80">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by client name, owner email, or account ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="grace_period">Grace Period</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={(val) => setPlanFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Plan Tier</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Price</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Billing Start</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Current Expiry</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Razorpay Sub ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading subscriptions...</span>
                  </TableCell>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <div>
                        <div className="font-bold text-foreground">{sub.accountName}</div>
                        <div className="text-[11px] text-muted-foreground">{sub.ownerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold text-[10px] uppercase">
                        {sub.planName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ₹{sub.planPrice.toLocaleString('en-IN')}/mo
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          sub.status === 'active'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : sub.status === 'trialing'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                            : sub.status === 'grace_period'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-foreground font-semibold text-[11px]">
                      {new Date(sub.expiryDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {sub.razorpaySubscriptionId || 'N/A (Direct)'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
