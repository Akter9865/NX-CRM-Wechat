'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  Users,
  MessageSquare,
  Crown,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AnalyticsData {
  monthlyRevenue: Record<string, number>;
  clientGrowth: Record<string, number>;
  planAdoption: Record<string, number>;
  messageVolume: Record<string, { sent: number; received: number; automations: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/analytics');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.analytics);
      }
    } catch (err) {
      console.error('[Fetch Analytics Error]:', err);
      toast.error('Failed to load platform analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Platform Revenue & Growth Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Historical monthly recurring revenue (MRR), client acquisition cohorts, and messaging bandwidth trends.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchAnalytics()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <span>Calculating platform analytics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Trends */}
          <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-400" />
                <span>Monthly Recurring Revenue (MRR)</span>
              </h3>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                INR (₹)
              </Badge>
            </div>

            <div className="space-y-3 pt-2">
              {data && Object.keys(data.monthlyRevenue).length > 0 ? (
                Object.entries(data.monthlyRevenue).map(([month, amount]) => (
                  <div key={month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">{month}</span>
                      <span className="text-foreground font-extrabold">₹{amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${Math.min(100, (amount / 50000) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No verified monthly revenue recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Plan Adoption Share */}
          <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Crown className="size-4 text-amber-400" />
                <span>Plan Adoption Distribution</span>
              </h3>
              <Badge variant="outline" className="border-border text-[10px]">
                Subscriptions
              </Badge>
            </div>

            <div className="space-y-3 pt-2">
              {data && Object.keys(data.planAdoption).length > 0 ? (
                Object.entries(data.planAdoption).map(([planId, count]) => (
                  <div key={planId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground uppercase">{planId} Tier</span>
                      <span className="text-foreground font-bold">{count} accounts</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          planId === 'pro'
                            ? 'bg-blue-500'
                            : planId === 'business'
                            ? 'bg-emerald-500'
                            : planId === 'enterprise'
                            ? 'bg-purple-500'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${Math.min(100, count * 20)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No subscriptions recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Messaging Bandwidth Trends */}
          <div className="rounded-3xl border border-border bg-card/60 p-6 space-y-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="size-4 text-purple-400" />
                <span>Monthly WhatsApp Traffic (Sent vs Received)</span>
              </h3>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">
                Bandwidth
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {data && Object.keys(data.messageVolume).length > 0 ? (
                Object.entries(data.messageVolume).map(([period, counts]) => (
                  <div key={period} className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2 text-xs">
                    <div className="font-bold text-foreground">{period}</div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Messages Sent:</span>
                        <strong className="text-foreground">{counts.sent.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages Received:</span>
                        <strong className="text-foreground">{counts.received.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Automation Runs:</span>
                        <strong className="text-foreground">{counts.automations.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-xs text-muted-foreground">
                  No monthly message traffic recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
