'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Send,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConnectionInfo {
  id: string;
  connection_name?: string;
  business_name?: string;
  display_phone_number?: string;
  phone_number_id?: string;
  status: string;
  last_webhook_at?: string | null;
}

export function WhatsAppStatusBanner() {
  const { accountId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      if (!accountId) return;
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('whatsapp_config')
          .select('id, connection_name, business_name, display_phone_number, phone_number_id, status, last_webhook_at')
          .eq('account_id', accountId)
          .eq('is_archived', false);

        if (!cancelled && !error && data) {
          setConnections(data as ConnectionInfo[]);
        }
      } catch (err) {
        console.error('[WhatsAppStatusBanner] error checking connection:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (loading) {
    return (
      <div className="h-16 w-full rounded-2xl border border-border/70 bg-card/60 animate-pulse" />
    );
  }

  const activeConnected = connections.find((c) => c.status === 'connected');
  const hasAnyConfig = connections.length > 0;

  if (activeConnected) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-card to-card p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-emerald-500/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm shadow-emerald-500/10">
              <MessageSquare className="size-5" />
              <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground truncate">
                  {activeConnected.connection_name || activeConnected.business_name || 'WhatsApp Business API'}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  Live & Connected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {activeConnected.display_phone_number || `ID: ${activeConnected.phone_number_id}`}
                {connections.length > 1 && ` (+${connections.length - 1} more)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/inbox">
              <Button
                size="sm"
                className="h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 shadow-sm gap-1.5 transition-all group"
              >
                <MessageSquare className="size-3.5" />
                <span>Go to Inbox</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/settings?tab=whatsapp">
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 rounded-xl border-border/80 hover:border-border text-xs font-semibold px-3"
              >
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not connected or action required
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-card to-card p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-amber-500/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 shadow-sm shadow-amber-500/10">
            <AlertCircle className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                {hasAnyConfig ? 'WhatsApp Registration Required' : 'Connect Your WhatsApp Business Number'}
              </span>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              >
                Action Required
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasAnyConfig
                ? 'Enter your 6-digit Two-Step PIN to complete Cloud API webhook registration.'
                : 'Connect Meta WhatsApp Cloud API credentials to start receiving and sending messages.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/settings?tab=whatsapp">
            <Button
              size="sm"
              className="h-8.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 shadow-sm gap-1.5 transition-all group"
            >
              <Zap className="size-3.5" />
              <span>{hasAnyConfig ? 'Complete Registration' : 'Connect WhatsApp'}</span>
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
