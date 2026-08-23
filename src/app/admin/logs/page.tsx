'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  Filter,
  ShieldAlert,
  Webhook,
  Receipt,
  FileCode2,
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

interface AuditLogItem {
  id: string;
  admin_email: string;
  admin_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export default function AdminLogsPage() {
  const [category, setCategory] = useState('audit'); // 'audit', 'webhooks', 'payments'
  const [logs, setLogs] = useState<{
    audit: AuditLogItem[];
    webhooks: unknown[];
    payments: unknown[];
  }>({
    audit: [],
    webhooks: [],
    payments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch(`/api/admin/logs?category=${category}&search=${encodeURIComponent(search)}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('[Fetch Logs Error]:', err);
      toast.error('Failed to load system logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Searchable Logs Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable audit logs for administrative actions, webhook deliveries, and payment verification events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchLogs()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/80">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'audit', label: 'Admin Audit Trail' },
            { id: 'webhooks', label: 'Razorpay & Webhooks' },
            { id: 'payments', label: 'Payment Logs' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={category === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(tab.id)}
              className={`h-9 rounded-xl text-xs font-semibold ${
                category === tab.id
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by action, email, or target ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Timestamp</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Action / Event</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Actor</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Target</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Details (JSON)</TableHead>
                <TableHead className="text-xs font-bold text-foreground">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading logs stream...</span>
                  </TableCell>
                </TableRow>
              ) : category === 'audit' && logs.audit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No admin audit logs recorded yet.
                  </TableCell>
                </TableRow>
              ) : category === 'audit' ? (
                logs.audit.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground text-[11px] py-3 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-bold text-foreground">{log.admin_email}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{log.admin_role}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px]">
                      {log.target_type} {log.target_id ? `(${log.target_id.substring(0, 8)}...)` : ''}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {log.ip_address || 'internal'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Logs stream active.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
