'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FeatureFlag } from '@/lib/admin/types';
import { toast } from 'sonner';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFlags = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/features');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setFlags(data.featureFlags || []);
      }
    } catch (err) {
      console.error('[Fetch Flags Error]:', err);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggleGlobal = async (flag: FeatureFlag, enabled: boolean) => {
    setUpdatingId(flag.id);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: flag.id,
          enabledGlobally: enabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      toast.success(`Feature "${flag.name}" ${enabled ? 'enabled' : 'disabled'} globally`);
      fetchFlags(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle flag';
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Dynamic Feature Flags & Entitlements
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Instantly toggle platform capabilities (e.g. Broadcast campaigns, Flow Builder, AI auto-replies) globally without frontend code changes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchFlags()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Feature Flags Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Feature Name & Key</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Description</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Allowed Plans</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Global Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading feature flags...</span>
                  </TableCell>
                </TableRow>
              ) : flags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No feature flags configured.
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => {
                  const isUpdating = updatingId === flag.id;

                  return (
                    <TableRow key={flag.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{flag.name}</span>
                            {flag.id === 'broadcast' && (
                              <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[9px] uppercase">
                                Coming Soon / Flagged
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">{flag.id}</div>
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground max-w-sm">
                        {flag.description || 'No description provided'}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {flag.allowedPlans.map((p, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[9px] font-bold uppercase bg-muted/60"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={flag.enabledGlobally}
                            disabled={isUpdating}
                            onCheckedChange={(checked) => handleToggleGlobal(flag, checked)}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              flag.enabledGlobally ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {flag.enabledGlobally ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
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
