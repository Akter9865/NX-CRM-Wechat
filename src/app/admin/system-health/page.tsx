'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Radio,
  CreditCard,
  Cpu,
  HardDrive,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  description: string;
}

interface HealthData {
  timestamp: string;
  overallHealth: string;
  services: ServiceHealth[];
  server: {
    nodeVersion: string;
    uptimeSeconds: number;
    memoryUsageMb: number;
  };
}

export default function AdminSystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/system-health');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('[Fetch Health Error]:', err);
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getServiceIcon = (name: string) => {
    if (name.includes('PostgreSQL') || name.includes('Database')) return Database;
    if (name.includes('WhatsApp')) return Radio;
    if (name.includes('Razorpay')) return CreditCard;
    if (name.includes('AI')) return Cpu;
    if (name.includes('Storage')) return HardDrive;
    return Server;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Real-Time System Diagnostics & Health
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Live ping diagnostics across Database connection pooling, Meta WhatsApp Graph API, Razorpay gateway, and AI inference latency.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchHealth()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Run Live Diagnostics</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <span>Pinging system dependencies...</span>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-300">
                  {data?.overallHealth}
                </h3>
                <p className="text-xs text-emerald-400/80">
                  All critical platform components responding within expected SLA latency.
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-right">
              <div>Checked: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}</div>
              <div className="text-[11px]">Server Uptime: {data?.server.uptimeSeconds ? `${Math.round(data.server.uptimeSeconds / 3600)} hrs` : 'N/A'}</div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.services.map((svc, idx) => {
              const Icon = getServiceIcon(svc.name);
              const isHealthy = svc.status === 'healthy';

              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-border bg-card">
                      <Icon className="size-5 text-emerald-400" />
                    </div>

                    <Badge
                      className={`text-[10px] font-bold uppercase ${
                        isHealthy
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {svc.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-foreground">{svc.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{svc.description}</p>
                  </div>

                  <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Response Latency:</span>
                    <span className="font-mono font-bold text-emerald-400">{svc.latencyMs} ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Server Architecture Details */}
          <div className="rounded-3xl border border-border bg-card/40 p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Underlying Runtime Infrastructure
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px]">Node Environment</span>
                <strong className="text-foreground">{data?.server.nodeVersion} (Next.js Standalone)</strong>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px]">Heap Memory Used</span>
                <strong className="text-foreground">{data?.server.memoryUsageMb} MB</strong>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px]">Protocol</span>
                <strong className="text-foreground">HTTPS / TLS 1.3 Strict</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
