'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  Zap,
  Activity,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface WhatsAppConnectionItem {
  id: string;
  accountId: string;
  clientName: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  status: string;
  qualityRating: string;
  isDefault: boolean;
  templatesCount: number;
  approvedTemplatesCount: number;
  createdAt: string;
}

export default function AdminWhatsAppPage() {
  const [connections, setConnections] = useState<WhatsAppConnectionItem[]>([]);
  const [summary, setSummary] = useState<{
    totalConnections: number;
    activeConnections: number;
    degradedConnections: number;
    totalTemplates: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWhatsApp = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/whatsapp');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConnections(data.connections || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('[Fetch WhatsApp Error]:', err);
      toast.error('Failed to load WhatsApp infrastructure metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWhatsApp();
  }, [fetchWhatsApp]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            WhatsApp & API Infrastructure Monitor
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time Meta Cloud API v22.0 phone number connections, WABA registrations, and verified template status.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchWhatsApp()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Total Connected Numbers</span>
            <Radio className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalConnections || 0}
          </div>
          <div className="text-[10px] text-emerald-400">Meta Cloud API v22.0</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Active & Healthy</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {summary?.activeConnections || 0}
          </div>
          <div className="text-[10px] text-muted-foreground">Webhook status: Normal</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Degraded / Unverified</span>
            <AlertTriangle className="size-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {summary?.degradedConnections || 0}
          </div>
          <div className="text-[10px] text-muted-foreground">Registration pending</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Synced Templates</span>
            <MessageSquare className="size-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalTemplates || 0}
          </div>
          <div className="text-[10px] text-blue-400">Meta Approved HSM</div>
        </div>
      </div>

      {/* Connections Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Account</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Display Phone Number</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Verified Business Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Phone Number ID</TableHead>
                <TableHead className="text-xs font-bold text-foreground">WABA ID</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">HSM Templates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading WhatsApp connections...</span>
                  </TableCell>
                </TableRow>
              ) : connections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No WhatsApp connections registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                connections.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      {c.clientName}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-400">
                      {c.displayPhoneNumber}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {c.verifiedName}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {c.phoneNumberId}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {c.wabaId}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.approvedTemplatesCount} / {c.templatesCount} approved
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
