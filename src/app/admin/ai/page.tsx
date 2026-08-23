'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Cpu,
  Coins,
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

interface AiConfigItem {
  id: string;
  accountId: string;
  clientName: string;
  provider: string;
  model: string;
  isEnabled: boolean;
  confidenceThreshold: number;
  docsCount: number;
  updatedAt: string;
}

export default function AdminAiPage() {
  const [configs, setConfigs] = useState<AiConfigItem[]>([]);
  const [summary, setSummary] = useState<{
    totalConfiguredClients: number;
    activeAiClients: number;
    totalKnowledgeDocs: number;
    modelDistribution: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAiData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/ai');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('[Fetch AI Error]:', err);
      toast.error('Failed to load AI metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAiData();
  }, [fetchAiData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            AI Agents & Model Token Consumption
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Track BYOK AI models (Google Gemini & OpenAI), RAG knowledge base document indexing, and auto-reply invocation rates.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchAiData()}
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
            <span className="text-xs font-semibold uppercase">Configured AI Workspaces</span>
            <Bot className="size-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalConfiguredClients || 0}
          </div>
          <div className="text-[10px] text-purple-400">BYOK Architecture</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Active Auto-Replies</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {summary?.activeAiClients || 0}
          </div>
          <div className="text-[10px] text-muted-foreground">Generating live drafts</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Indexed Knowledge Docs</span>
            <BookOpen className="size-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalKnowledgeDocs || 0}
          </div>
          <div className="text-[10px] text-blue-400">RAG Vector Chunks</div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Primary Engine</span>
            <Cpu className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            Gemini 1.5
          </div>
          <div className="text-[10px] text-muted-foreground">Google AI Platform</div>
        </div>
      </div>

      {/* Configurations Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Provider</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Model Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Auto-Reply State</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Confidence Threshold</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Knowledge Docs</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Last Configured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading AI configurations...</span>
                  </TableCell>
                </TableRow>
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No client AI configurations found.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      {c.clientName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] font-mono">
                        {c.provider.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {c.model}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          c.isEnabled
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {c.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {Math.round(c.confidenceThreshold * 100)}%
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {c.docsCount} documents
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(c.updatedAt).toLocaleString()}
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
