'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Search,
  RefreshCw,
  MessageSquare,
  Users,
  Clock,
  Tag,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ConversationItem {
  id: string;
  accountId: string;
  clientName: string;
  contactName: string;
  contactPhone: string;
  channel: string;
  assignedAgent: string;
  status: string;
  tags: string[];
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export default function AdminInboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchInbox = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (selectedAccount && selectedAccount !== 'all') params.set('accountId', selectedAccount);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/inbox?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[Fetch Inbox Error]:', err);
      toast.error('Failed to load multi-tenant inbox audit');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccount, statusFilter]);

  // Load clients for filter
  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setClients(d.clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Multi-Tenant Inbox Inspector
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Audit conversation queues, customer channels, agent assignments, and SLA response timelines across client accounts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchInbox()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/80">
        <div className="flex-1 w-full">
          <Select value={selectedAccount} onValueChange={(val) => setSelectedAccount(val || 'all')}>
            <SelectTrigger className="h-10 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="Filter by Client Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Client Accounts (Global View)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl border-border bg-card text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open / Active</SelectItem>
            <SelectItem value="closed">Closed / Resolved</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Customer Contact</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Channel</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Assigned Agent</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Tags</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Last Message Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Inspecting conversations...</span>
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No active conversations recorded for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv) => (
                  <TableRow key={conv.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      {conv.clientName}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-bold text-foreground">{conv.contactName}</div>
                        <div className="text-[11px] text-muted-foreground">{conv.contactPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                        {conv.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {conv.assignedAgent}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          conv.status === 'open'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {conv.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {conv.tags.length > 0 ? (
                          conv.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] bg-muted px-1.5 py-0.2 rounded border border-border/80 text-muted-foreground">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(conv.lastMessageAt).toLocaleString()}
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
