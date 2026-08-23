'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
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

interface FlowItem {
  id: string;
  account_id: string;
  clientName: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  nodesCount: number;
  total_runs: number;
  last_run_at: string | null;
  created_at: string;
}

export default function AdminFlowsPage() {
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFlows = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/flows');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setFlows(data.flows || []);
      }
    } catch (err) {
      console.error('[Fetch Flows Error]:', err);
      toast.error('Failed to load flows data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Visual Flow Builder Inspector
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Audit drag-and-drop conversational workflows, node graphs, execution counts, and active runtime statuses.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchFlows()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Flows Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Flow Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Trigger Type</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Visual Canvas Nodes</TableHead>
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
                    <span>Loading flow workflows...</span>
                  </TableCell>
                </TableRow>
              ) : flows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No visual flows configured yet across client accounts.
                  </TableCell>
                </TableRow>
              ) : (
                flows.map((flow) => (
                  <TableRow key={flow.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="size-3.5 text-blue-400 shrink-0" />
                        <span>{flow.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {flow.clientName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {flow.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {flow.nodesCount} active nodes
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          flow.is_active
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {flow.is_active ? 'Active' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="font-extrabold text-foreground">
                      {(flow.total_runs || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {flow.last_run_at ? new Date(flow.last_run_at).toLocaleString() : 'Never'}
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
