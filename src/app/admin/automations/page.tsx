'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
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

interface AutomationItem {
  id: string;
  account_id: string;
  clientName: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  conditionsCount: number;
  actionsCount: number;
  total_runs: number;
  last_run_at: string | null;
  created_at: string;
}

export default function AdminAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAutomations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/automations');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAutomations(data.automations || []);
      }
    } catch (err) {
      console.error('[Fetch Automations Error]:', err);
      toast.error('Failed to load automations data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Automations Inspector
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor client automation rules, triggers, execution counts, and active runtime statuses.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchAutomations()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Automations Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Automation Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Trigger Type</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Rules (If / Then)</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Total Invocations</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Last Run At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading automations engine state...</span>
                  </TableCell>
                </TableRow>
              ) : automations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No automations configured yet across client accounts.
                  </TableCell>
                </TableRow>
              ) : (
                automations.map((auto) => (
                  <TableRow key={auto.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      <div className="flex items-center gap-2">
                        <Zap className="size-3.5 text-amber-400 shrink-0" />
                        <span>{auto.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {auto.clientName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {auto.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {auto.conditionsCount} conditions → {auto.actionsCount} actions
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          auto.is_active
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {auto.is_active ? 'Active' : 'Paused'}
                      </span>
                    </TableCell>
                    <TableCell className="font-extrabold text-foreground">
                      {(auto.total_runs || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {auto.last_run_at ? new Date(auto.last_run_at).toLocaleString() : 'Never'}
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
