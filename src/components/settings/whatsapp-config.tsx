'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Radio,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  Activity,
  PhoneCall,
  ArrowRightLeft,
  Settings2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { dispatchWhatsAppStatusChanged } from '@/hooks/use-whatsapp-status';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import type { WhatsAppConfig } from '@/types';

interface WhatsAppTestResults {
  healthy?: boolean;
  status?: string;
  message?: string;
  checks?: {
    token_decryptable?: boolean;
    phone_api_reachable?: boolean;
    waba_subscribed?: boolean;
  };
  phone_info?: {
    quality_rating?: string;
    display_phone_number?: string;
  };
}

export function WhatsAppConfigForm() {
  const t = useTranslations('Settings.whatsapp');
  const { canEditSettings } = useAuth();

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<WhatsAppConfig[]>([]);
  const [usage, setUsage] = useState<{ current: number; limit: number | null; isOverLimit: boolean }>({
    current: 0,
    limit: 1,
    isOverLimit: false,
  });
  const [plan, setPlan] = useState<{ id: string; name: string }>({ id: 'free', name: 'Free' });

  // Dialog States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // Selected Connection for Modals
  const [selectedConn, setSelectedConn] = useState<WhatsAppConfig | null>(null);

  // Add / Replace Form States
  const [connectionName, setConnectionName] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [businessPortfolioId, setBusinessPortfolioId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('wacrm_verify_token');
  const [pin, setPin] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [mirrorMedia, setMirrorMedia] = useState(true);

  // Action Loading States
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<WhatsAppTestResults | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : 'https://your-domain.com/api/whatsapp/webhook';

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/connections');
      if (!res.ok) throw new Error('Failed to fetch connections');
      const data = await res.json();
      setConnections(data.connections || []);
      if (data.usage) setUsage(data.usage);
      if (data.plan) setPlan(data.plan);
      dispatchWhatsAppStatusChanged();
    } catch (err) {
      console.error(err);
      toast.error('Could not load WhatsApp connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const resetForm = () => {
    setConnectionName('');
    setPhoneNumberId('');
    setWabaId('');
    setBusinessPortfolioId('');
    setAccessToken('');
    setVerifyToken('wacrm_verify_token');
    setPin('');
    setAppId('');
    setAppSecret('');
    setShowAccessToken(false);
    setShowAppSecret(false);
    setMirrorMedia(true);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const openReplaceModal = (conn: WhatsAppConfig) => {
    resetForm();
    setSelectedConn(conn);
    setConnectionName(conn.connection_name || '');
    setWabaId(conn.waba_id || '');
    setBusinessPortfolioId(conn.business_portfolio_id || '');
    setAppId(conn.app_id || '');
    setReplaceModalOpen(true);
  };

  const openRemoveModal = (conn: WhatsAppConfig) => {
    setSelectedConn(conn);
    setRemoveModalOpen(true);
  };

  const openManageModal = (conn: WhatsAppConfig) => {
    setSelectedConn(conn);
    setConnectionName(conn.connection_name || '');
    setMirrorMedia(conn.mirror_inbound_media !== false);
    setAppId(conn.app_id || '');
    setBusinessPortfolioId(conn.business_portfolio_id || '');
    setManageModalOpen(true);
  };

  // 1. Create New Connection
  const handleCreateConnection = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast.error('Phone Number ID and Permanent Access Token are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/whatsapp/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_name: connectionName.trim() || undefined,
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim() || undefined,
          business_portfolio_id: businessPortfolioId.trim() || undefined,
          access_token: accessToken.trim(),
          verify_token: verifyToken.trim() || undefined,
          pin: pin.trim() || undefined,
          app_id: appId.trim() || undefined,
          app_secret: appSecret.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create WhatsApp connection');
      }

      toast.success('WhatsApp connection added successfully!');
      setAddModalOpen(false);
      resetForm();
      fetchConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create WhatsApp connection';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // 2. Replace Connection
  const handleReplaceConnection = async () => {
    if (!selectedConn) return;
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast.error('New Phone Number ID and Access Token are required.');
      return;
    }

    try {
      setReplacing(true);
      const res = await fetch(`/api/whatsapp/connections/${selectedConn.id}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim() || undefined,
          business_portfolio_id: businessPortfolioId.trim() || undefined,
          access_token: accessToken.trim(),
          verify_token: verifyToken.trim() || undefined,
          pin: pin.trim() || undefined,
          app_id: appId.trim() || undefined,
          app_secret: appSecret.trim() || undefined,
          connection_name: connectionName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to replace connection');
      }

      toast.success('WhatsApp connection credentials replaced successfully!');
      setReplaceModalOpen(false);
      resetForm();
      fetchConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to replace connection';
      toast.error(msg);
    } finally {
      setReplacing(false);
    }
  };

  // 3. Remove / Soft Delete Connection
  const handleRemoveConnection = async () => {
    if (!selectedConn) return;
    try {
      setRemoving(true);
      const res = await fetch(`/api/whatsapp/connections/${selectedConn.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect WhatsApp connection');
      }

      toast.success('WhatsApp connection disconnected. Historical data preserved.');
      setRemoveModalOpen(false);
      fetchConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect WhatsApp connection';
      toast.error(msg);
    } finally {
      setRemoving(false);
    }
  };

  // 4. Test Connection
  const handleTestConnection = async (conn: WhatsAppConfig) => {
    try {
      setTestingId(conn.id);
      setSelectedConn(conn);
      const res = await fetch(`/api/whatsapp/connections/${conn.id}/test`, {
        method: 'POST',
      });

      const data = await res.json();
      setTestResults(data);
      setTestModalOpen(true);

      if (data.healthy) {
        toast.success(data.message || 'WhatsApp API connection is healthy!');
      } else {
        toast.error(data.message || 'WhatsApp connection test failed');
      }
      fetchConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      toast.error(msg);
    } finally {
      setTestingId(null);
    }
  };

  // 5. Update Connection Metadata
  const handleSaveManage = async () => {
    if (!selectedConn) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/whatsapp/connections/${selectedConn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_name: connectionName.trim() || undefined,
          mirror_inbound_media: mirrorMedia,
          app_id: appId.trim() || undefined,
          business_portfolio_id: businessPortfolioId.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to update connection');
      toast.success('Connection settings updated');
      setManageModalOpen(false);
      fetchConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update connection';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const q = quality.toUpperCase();
    if (q === 'GREEN' || q === 'HIGH') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
          High Quality
        </Badge>
      );
    }
    if (q === 'YELLOW' || q === 'MEDIUM') {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
          Medium Quality
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-xs">
        Low Quality
      </Badge>
    );
  };

  const isAtLimit = usage.limit !== null && usage.current >= usage.limit;

  return (
    <section className="space-y-6 max-w-5xl">
      {/* Header & Plan Usage Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {t('title')}
            </h2>
            <Badge variant="outline" className="text-xs uppercase font-mono font-medium tracking-wider text-primary border-primary/30">
              {plan.name} Plan
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-foreground">
              {usage.limit === null ? (
                <span className="text-emerald-400 font-mono">Unlimited Connections</span>
              ) : (
                <span className="font-mono">{usage.current} / {usage.limit} Connections Used</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {usage.limit === null ? 'Enterprise unlimited capacity' : `${Math.max(0, usage.limit - usage.current)} available slot(s)`}
            </p>
          </div>

          <Button
            onClick={openAddModal}
            disabled={!canEditSettings || (isAtLimit && usage.limit !== null)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-9 shadow-sm"
          >
            <Plus className="size-4 mr-1.5" />
            {t('addConnection')}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchConnections}
            disabled={loading}
            className="h-9 w-9 border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Plan limit warning banner */}
      {isAtLimit && usage.limit !== null && (
        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle className="size-4 text-amber-400 mt-0.5" />
          <AlertTitle className="font-medium text-amber-200">
            {t('planLimitReached')}
          </AlertTitle>
          <AlertDescription className="text-amber-300/80 mt-1">
            {t('planLimitReachedDesc', { plan: plan.name, limit: usage.limit })}
          </AlertDescription>
        </Alert>
      )}

      {/* Zero Rebuild Notice Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <ShieldCheck className="size-4 text-primary mt-0.5" />
        <AlertTitle className="text-foreground text-sm font-medium">
          {t('reconnectTitle')}
        </AlertTitle>
        <AlertDescription className="text-muted-foreground text-xs leading-relaxed mt-1">
          {t('reconnectDesc')}
        </AlertDescription>
      </Alert>

      {/* Connections List */}
      <div className="space-y-4">
        {loading && connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-border bg-card/50">
            <Loader2 className="size-6 animate-spin text-primary mb-3" />
            <p className="text-xs text-muted-foreground">Loading WhatsApp connections...</p>
          </div>
        ) : connections.length === 0 ? (
          <Card className="border-dashed border-border bg-card/40 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <PhoneCall className="size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{t('noConnectionsYet')}</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              {t('noConnectionsDesc')}
            </p>
            <Button
              onClick={openAddModal}
              disabled={!canEditSettings}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              {t('addConnection')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {connections.map((conn) => {
              const isTesting = testingId === conn.id;
              const isHealthy = conn.status === 'connected';

              return (
                <Card key={conn.id} className="border-border shadow-sm hover:border-border/80 transition-all bg-card overflow-hidden">
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {conn.connection_name || conn.business_name || `WhatsApp (${conn.phone_number_id.slice(-4)})`}
                          </span>

                          {conn.is_default && (
                            <Badge variant="outline" className="text-[10px] uppercase border-primary/40 text-primary bg-primary/5">
                              {t('defaultBadge')}
                            </Badge>
                          )}

                          {isHealthy ? (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              {t('statusConnected')}
                            </Badge>
                          ) : conn.status === 'error' ? (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs flex items-center gap-1">
                              <AlertTriangle className="size-3" />
                              {t('statusError')}
                            </Badge>
                          ) : conn.status === 'banned' ? (
                            <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-xs flex items-center gap-1">
                              {t('statusBanned')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              {conn.status}
                            </Badge>
                          )}

                          {formatQualityBadge(conn.quality_rating)}

                          {conn.registered_at && (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                              Webhook Active
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span>{conn.display_phone_number || 'Phone ID: ' + conn.phone_number_id}</span>
                          {conn.business_name && (
                            <span className="text-muted-foreground font-sans">• {conn.business_name}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(conn)}
                          disabled={isTesting || !canEditSettings}
                          className="h-8 text-xs border-border text-muted-foreground hover:text-foreground"
                        >
                          {isTesting ? (
                            <Loader2 className="size-3.5 animate-spin mr-1" />
                          ) : (
                            <Zap className="size-3.5 mr-1 text-primary" />
                          )}
                          {t('testConnection')}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReplaceModal(conn)}
                          disabled={!canEditSettings}
                          className="h-8 text-xs border-border text-muted-foreground hover:text-foreground"
                        >
                          <ArrowRightLeft className="size-3.5 mr-1" />
                          {t('replaceConnection')}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageModal(conn)}
                          disabled={!canEditSettings}
                          className="h-8 text-xs border-border text-muted-foreground hover:text-foreground"
                        >
                          <Settings2 className="size-3.5 mr-1" />
                          {t('manageConnection')}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRemoveModal(conn)}
                          disabled={!canEditSettings}
                          className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-[11px] font-mono">
                      <div className="bg-muted/30 p-2 rounded border border-border/30 flex items-center justify-between">
                        <span className="text-muted-foreground">Phone ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{conn.phone_number_id}</span>
                          <button onClick={() => handleCopy(conn.phone_number_id, 'Phone Number ID')} className="text-muted-foreground hover:text-foreground">
                            <Copy className="size-3" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-muted/30 p-2 rounded border border-border/30 flex items-center justify-between">
                        <span className="text-muted-foreground">WABA ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{conn.waba_id || '—'}</span>
                          {conn.waba_id && (
                            <button onClick={() => handleCopy(conn.waba_id!, 'WABA ID')} className="text-muted-foreground hover:text-foreground">
                              <Copy className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted/30 p-2 rounded border border-border/30 flex items-center justify-between">
                        <span className="text-muted-foreground">Portfolio ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{conn.business_portfolio_id || '—'}</span>
                          {conn.business_portfolio_id && (
                            <button onClick={() => handleCopy(conn.business_portfolio_id!, 'Portfolio ID')} className="text-muted-foreground hover:text-foreground">
                              <Copy className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted/30 p-2 rounded border border-border/30 flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Radio className={`size-2.5 ${conn.last_webhook_at ? 'text-emerald-400 animate-pulse' : 'text-muted-foreground'}`} />
                          Heartbeat:
                        </span>
                        <span className="truncate max-w-[130px] text-muted-foreground">
                          {conn.last_webhook_at ? formatDistanceToNow(new Date(conn.last_webhook_at), { addSuffix: true }) : 'No events'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Centralized Webhook Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base">{t('webhookTitle')}</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            {t('webhookDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">{t('webhookUrl')}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="bg-muted border-border text-muted-foreground font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
                className="shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions Accordion */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base">{t('setupInstructions')}</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            {t('setupInstructionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion className="w-full">
            <AccordionItem value="step1" className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline text-xs py-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                  {t('step1')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs">
                <ol className="list-decimal list-inside space-y-1">
                  <li dangerouslySetInnerHTML={{ __html: t('step1_1') }} />
                  <li>{t('step1_2')}</li>
                  <li>{t('step1_3')}</li>
                  <li>{t('step1_4')}</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2" className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline text-xs py-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                  {t('step2')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs">
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t('step2_1')}</li>
                  <li>{t('step2_2')}</li>
                  <li>{t('step2_3')}</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3" className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline text-xs py-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                  {t('step3')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs">
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t('step3_1')}</li>
                  <li dangerouslySetInnerHTML={{ __html: t.raw('step3_2') }} />
                  <li dangerouslySetInnerHTML={{ __html: t.raw('step3_3') }} />
                  <li dangerouslySetInnerHTML={{ __html: t.raw('step3_4') }} />
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step4" className="border-border">
              <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline text-xs py-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                  {t('step4')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs">
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t('step4_1')}</li>
                  <li>{t('step4_2')}</li>
                  <li dangerouslySetInnerHTML={{ __html: t.raw('step4_3') }} />
                  <li dangerouslySetInnerHTML={{ __html: t.raw('step4_4') }} />
                  <li>{t('step4_5')}</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-4 pt-4 border-t border-border">
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="size-3.5" />
              {t('metaDocs')}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 1. ADD WHATSAPP CONNECTION MODAL                             */}
      {/* ============================================================ */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t('addConnection')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Connect a new Meta WhatsApp Cloud API phone number to your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('connectionName')}</Label>
              <Input
                placeholder={t('connectionNamePlaceholder')}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                className="bg-muted text-xs font-medium"
              />
              <p className="text-[11px] text-muted-foreground">{t('connectionNameHint')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('phoneNumberId')} *</Label>
                <Input
                  placeholder="e.g. 102938475610293"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value.trim())}
                  className="bg-muted text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('wabaId')}</Label>
                <Input
                  placeholder="e.g. 987654321098765"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value.trim())}
                  className="bg-muted text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('businessPortfolioId')}</Label>
              <Input
                placeholder={t('businessPortfolioIdPlaceholder')}
                value={businessPortfolioId}
                onChange={(e) => setBusinessPortfolioId(e.target.value.trim())}
                className="bg-muted text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('accessToken')} *</Label>
              <div className="relative">
                <Input
                  type={showAccessToken ? 'text' : 'password'}
                  placeholder={t('accessTokenPlaceholder')}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value.trim())}
                  className="bg-muted text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAccessToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">{t('appSecretHint')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('webhookVerifyToken')}</Label>
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="bg-muted text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('twoStepPin')} {t('optional')}</Label>
                <Input
                  maxLength={6}
                  placeholder={t('pinPlaceholder')}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-muted text-xs font-mono tracking-widest"
                />
              </div>
            </div>

            {/* Advanced Meta App */}
            <Accordion className="border-t border-border/60 pt-1">
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1.5 hover:no-underline">
                  {t('advancedSettings')}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('appId')}</Label>
                      <Input
                        placeholder={t('appIdPlaceholder')}
                        value={appId}
                        onChange={(e) => setAppId(e.target.value.trim())}
                        className="bg-muted text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t('appSecret')}</Label>
                      <div className="relative">
                        <Input
                          type={showAppSecret ? 'text' : 'password'}
                          placeholder={t('appSecretPlaceholder')}
                          value={appSecret}
                          onChange={(e) => setAppSecret(e.target.value.trim())}
                          className="bg-muted text-xs font-mono pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAppSecret(!showAppSecret)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAppSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateConnection}
              disabled={saving}
              className="bg-primary text-primary-foreground font-medium"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              {saving ? t('saving') : 'Verify & Connect WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 2. REPLACE WHATSAPP CONNECTION MODAL                         */}
      {/* ============================================================ */}
      <Dialog open={replaceModalOpen} onOpenChange={setReplaceModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t('replaceConnection')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Swap credentials for this slot with zero downtime. All historical messages remain preserved.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-primary/5 border-primary/20 text-xs">
            <ShieldCheck className="size-4 text-primary" />
            <AlertTitle className="font-medium text-foreground">Zero Historical Data Loss</AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1">
              {t('replaceWarning')}
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('connectionName')}</Label>
              <Input
                placeholder={t('connectionNamePlaceholder')}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                className="bg-muted text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New {t('phoneNumberId')} *</Label>
                <Input
                  placeholder="e.g. 102938475610293"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value.trim())}
                  className="bg-muted text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New {t('wabaId')}</Label>
                <Input
                  placeholder="e.g. 987654321098765"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value.trim())}
                  className="bg-muted text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">New {t('accessToken')} *</Label>
              <div className="relative">
                <Input
                  type={showAccessToken ? 'text' : 'password'}
                  placeholder={t('accessTokenPlaceholder')}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value.trim())}
                  className="bg-muted text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAccessToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('twoStepPin')} {t('optional')}</Label>
              <Input
                maxLength={6}
                placeholder={t('pinPlaceholder')}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-muted text-xs font-mono tracking-widest"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReplaceModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReplaceConnection}
              disabled={replacing}
              className="bg-primary text-primary-foreground font-medium"
            >
              {replacing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              {replacing ? 'Validating...' : 'Validate & Replace Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 3. REMOVE WHATSAPP CONNECTION MODAL                          */}
      {/* ============================================================ */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500" />
              {t('removeConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {t('removeConfirmDesc')}
            </DialogDescription>
          </DialogHeader>

          {selectedConn && (
            <div className="bg-muted/40 p-3 rounded-lg border border-border/60 text-xs space-y-1 my-2">
              <div className="font-semibold text-foreground">{selectedConn.connection_name}</div>
              <div className="text-muted-foreground font-mono">{selectedConn.display_phone_number || selectedConn.phone_number_id}</div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRemoveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRemoveConnection}
              disabled={removing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {removing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              {removing ? 'Disconnecting...' : 'Disconnect WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 4. TEST CONNECTION RESULTS DIALOG                            */}
      {/* ============================================================ */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Connection Diagnostics
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Live Meta Graph API health check results.
            </DialogDescription>
          </DialogHeader>

          {testResults && (
            <div className="space-y-4 py-2">
              <div className={`p-3 rounded-lg border text-xs ${testResults.healthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                <div className="font-semibold flex items-center gap-1.5">
                  {testResults.healthy ? <CheckCircle2 className="size-4 text-emerald-400" /> : <AlertTriangle className="size-4 text-rose-400" />}
                  Status: {testResults.status}
                </div>
                <p className="mt-1 text-xs opacity-90">{testResults.message}</p>
              </div>

              <div className="space-y-2 border border-border/60 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Token Decryption:</span>
                  <span className={testResults.checks?.token_decryptable ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResults.checks?.token_decryptable ? '✓ Valid' : '✕ Corrupted'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Meta Graph Reachable:</span>
                  <span className={testResults.checks?.phone_api_reachable ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResults.checks?.phone_api_reachable ? '✓ Connected' : '✕ Unreachable'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality Rating:</span>
                  <span className="font-semibold">{testResults.phone_info?.quality_rating || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WABA App Subscription:</span>
                  <span>{testResults.checks?.waba_subscribed ? '✓ Subscribed' : '— Not Checked'}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setTestModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 5. MANAGE CONNECTION MODAL                                   */}
      {/* ============================================================ */}
      <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t('manageConnection')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update connection preferences, display name, and attachment mirroring.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('connectionName')}</Label>
              <Input
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                className="bg-muted text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('businessPortfolioId')}</Label>
              <Input
                value={businessPortfolioId}
                onChange={(e) => setBusinessPortfolioId(e.target.value.trim())}
                className="bg-muted text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('appId')}</Label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value.trim())}
                className="bg-muted text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <p className="text-xs font-medium text-foreground">{t('mirrorInbound')}</p>
                <p className="text-[11px] text-muted-foreground">{t('mirrorInboundDesc')}</p>
              </div>
              <Switch
                checked={mirrorMedia}
                onCheckedChange={setMirrorMedia}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setManageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveManage}
              disabled={saving}
              className="bg-primary text-primary-foreground font-medium"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export { WhatsAppConfigForm as WhatsAppConfig };
