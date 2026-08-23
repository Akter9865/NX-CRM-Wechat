'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  FileSpreadsheet,
  Mail,
  Send,
  Calendar,
  KeyRound,
  Webhook,
  CheckCircle2,
  XCircle,
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

interface IntegrationSummary {
  totalApiKeys: number;
  activeApiKeys: number;
  totalWebhookEndpoints: number;
  activeWebhookEndpoints: number;
  googleSheetsActiveClients: number;
  zohoActiveClients: number;
  smtpActiveClients: number;
  telegramActiveClients: number;
  calendlyActiveClients: number;
}

interface ClientIntegrationItem {
  accountId: string;
  clientName: string;
  googleSheets: boolean;
  zoho: boolean;
  smtp: boolean;
  telegram: boolean;
  calendly: boolean;
  apiKeysCount: number;
  webhooksCount: number;
}

export default function AdminIntegrationsPage() {
  const [summary, setSummary] = useState<IntegrationSummary | null>(null);
  const [clientIntegrations, setClientIntegrations] = useState<ClientIntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIntegrations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/integrations');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary || null);
        setClientIntegrations(data.clientIntegrations || []);
      }
    } catch (err) {
      console.error('[Fetch Integrations Error]:', err);
      toast.error('Failed to load integrations metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Integrations Ecosystem Monitoring
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Audit third-party integrations (Google Sheets, Zoho, SMTP, Telegram, Calendly) and custom REST API keys.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchIntegrations()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <FileSpreadsheet className="size-3.5 text-emerald-400" />
            <span>Google Sheets</span>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.googleSheetsActiveClients || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Mail className="size-3.5 text-blue-400" />
            <span>Zoho & SMTP</span>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {(summary?.zohoActiveClients || 0) + (summary?.smtpActiveClients || 0)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Send className="size-3.5 text-cyan-400" />
            <span>Telegram Bots</span>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.telegramActiveClients || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <KeyRound className="size-3.5 text-purple-400" />
            <span>REST API Keys</span>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalApiKeys || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Webhook className="size-3.5 text-amber-400" />
            <span>Outbound Webhooks</span>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {summary?.totalWebhookEndpoints || 0}
          </div>
        </div>
      </div>

      {/* Client Integrations Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Client Workspace</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Google Sheets</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Zoho Mail / CRM</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Custom SMTP</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Telegram Bot</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Calendly</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">API Keys</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Webhooks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading integrations state...</span>
                  </TableCell>
                </TableRow>
              ) : clientIntegrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No client integrations active yet.
                  </TableCell>
                </TableRow>
              ) : (
                clientIntegrations.map((ci) => (
                  <TableRow key={ci.accountId} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground py-3">
                      {ci.clientName}
                    </TableCell>
                    <TableCell className="text-center">
                      {ci.googleSheets ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {ci.zoho ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {ci.smtp ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {ci.telegram ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {ci.calendly ? (
                        <CheckCircle2 className="size-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold text-foreground">
                      {ci.apiKeysCount}
                    </TableCell>
                    <TableCell className="text-center font-bold text-foreground">
                      {ci.webhooksCount}
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
