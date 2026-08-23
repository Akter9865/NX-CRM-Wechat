'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
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

interface PaymentItem {
  id: string;
  accountId: string;
  clientName: string;
  ownerEmail: string;
  ownerName: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySubscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPayments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('[Fetch Payments Error]:', err);
      toast.error('Failed to load payment transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Payment Records & Invoices
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Audit verified Razorpay payment IDs, orders, amounts, statuses, and receipt records.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchPayments()}
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
            placeholder="Search by Razorpay Payment ID, Order ID, client name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
          />
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="h-10 w-full sm:w-40 rounded-xl border-border bg-card text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="captured">Captured / Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Razorpay Payment ID</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Client Account</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Amount</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Method</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Order / Sub ID</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading payment transactions...</span>
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const isSuccess = p.status === 'captured' || p.status === 'success' || p.status === 'paid';
                  const isFailed = p.status === 'failed' || p.status === 'payment_failed';

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-bold text-foreground py-3">
                        {p.razorpayPaymentId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-bold text-foreground">{p.clientName}</div>
                          <div className="text-[11px] text-muted-foreground">{p.ownerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-extrabold text-foreground text-sm">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isSuccess
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : isFailed
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.paymentMethod}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {p.razorpayOrderId !== 'N/A' ? p.razorpayOrderId : p.razorpaySubscriptionId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {new Date(p.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
