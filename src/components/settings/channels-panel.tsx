'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  QrCode,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Radio,
  ExternalLink,
  Bot,
  Zap,
  Globe,
  Loader2,
  Check,
  Power,
  PlayCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SettingsPanelHead } from './settings-panel-head';
import type { ChannelConnection, ChannelType, QRSessionState } from '@/lib/channels/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ChannelsPanel() {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'whatsapp_web' | 'telegram' | 'whatsapp_cloud' | 'simulator'>('all');

  // WhatsApp Web QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSession, setQrSession] = useState<QRSessionState | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSimulating, setQrSimulating] = useState(false);

  // Telegram Setup Modal
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [tgToken, setTgToken] = useState('');
  const [tgName, setTgName] = useState('');
  const [tgVerifying, setTgVerifying] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgBotInfo, setTgBotInfo] = useState<{ id?: number; first_name?: string; username?: string } | null>(null);

  // Inbound Simulator Modal
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simChannel, setSimChannel] = useState<ChannelType>('telegram');
  const [simSenderName, setSimSenderName] = useState('Rahul Sharma');
  const [simSenderPhone, setSimSenderPhone] = useState('+91 98765 12345');
  const [simMessage, setSimMessage] = useState('Hey there! Is this CRM support available?');
  const [simulating, setSimulating] = useState(false);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/channels/connections');
      const data = await res.json();
      if (data.success && Array.isArray(data.connections)) {
        setConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to load channel connections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Start WhatsApp Web QR session
  const startQrSession = async () => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrSession(null);
    try {
      const connId = `wweb_${Date.now()}`;
      const res = await fetch(`/api/channels/connections/${connId}/qr?type=whatsapp_web`);
      const data = await res.json();
      if (data.success && data.session) {
        setQrSession(data.session);
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch {
      toast.error('Error initiating QR session');
    } finally {
      setQrLoading(false);
    }
  };

  // Simulate QR Code Scan
  const handleSimulateScan = async () => {
    if (!qrSession) return;
    setQrSimulating(true);
    try {
      const res = await fetch(`/api/channels/connections/${qrSession.sessionId}/simulate-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+91 98234 56789',
          device_name: 'WhatsApp Web (Chrome / macOS)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp Web linked and connected successfully!');
        setQrModalOpen(false);
        fetchConnections();
      } else {
        toast.error(data.error || 'Failed to simulate QR scan');
      }
    } catch {
      toast.error('Failed to link device');
    } finally {
      setQrSimulating(false);
    }
  };

  // Verify Telegram Bot Token
  const handleVerifyTelegramToken = async () => {
    if (!tgToken.trim()) {
      toast.error('Please enter a Telegram Bot Token');
      return;
    }
    setTgVerifying(true);
    setTgBotInfo(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken.trim()}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        setTgBotInfo(data.result);
        if (!tgName) setTgName(data.result.first_name || 'Telegram Bot');
        toast.success(`Verified: @${data.result.username} (${data.result.first_name})`);
      } else {
        toast.error(data.description || 'Invalid Telegram Bot Token');
      }
    } catch {
      toast.error('Could not reach Telegram API. Verify token and internet.');
    } finally {
      setTgVerifying(false);
    }
  };

  // Save Telegram Connection
  const handleSaveTelegram = async () => {
    if (!tgToken.trim()) {
      toast.error('Please enter a Telegram Bot Token');
      return;
    }
    setTgSaving(true);
    try {
      const res = await fetch('/api/channels/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_type: 'telegram',
          connection_name: tgName.trim() || tgBotInfo?.first_name || 'Telegram Bot',
          identifier: tgBotInfo?.username ? `@${tgBotInfo.username}` : undefined,
          credentials: { bot_token: tgToken.trim() },
          metadata: {
            bot_id: tgBotInfo?.id,
            bot_username: tgBotInfo?.username,
            bot_name: tgBotInfo?.first_name,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Telegram channel connected successfully!');
        setTgModalOpen(false);
        setTgToken('');
        setTgName('');
        setTgBotInfo(null);
        fetchConnections();
      } else {
        toast.error(data.error || 'Failed to save Telegram connection');
      }
    } catch {
      toast.error('Failed to save connection');
    } finally {
      setTgSaving(false);
    }
  };

  // Disconnect Channel
  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;
    try {
      const res = await fetch(`/api/channels/connections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${name} disconnected`);
        setConnections((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error('Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect channel');
    }
  };

  // Run Inbound Simulator
  const handleRunSimulator = async () => {
    setSimulating(true);
    try {
      const res = await fetch('/api/channels/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_type: simChannel,
          sender_name: simSenderName,
          sender_identifier: simSenderPhone,
          message_text: simMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Inbound chat simulated! Open Inbox to view & reply.');
        setSimModalOpen(false);
      } else {
        toast.error(data.error || 'Simulation failed');
      }
    } catch {
      toast.error('Failed to simulate message');
    } finally {
      setSimulating(false);
    }
  };

  const filteredConnections = connections.filter((c) => {
    if (selectedTab === 'all') return true;
    return c.channel_type === selectedTab;
  });

  const getChannelBadge = (type: ChannelType) => {
    switch (type) {
      case 'telegram':
        return (
          <Badge variant="outline" className="gap-1 border-sky-500/30 bg-sky-500/10 text-sky-400 font-medium">
            <Send className="size-3" />
            Telegram
          </Badge>
        );
      case 'whatsapp_web':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
            <Smartphone className="size-3" />
            WhatsApp Web (QR)
          </Badge>
        );
      case 'whatsapp_cloud':
      default:
        return (
          <Badge variant="outline" className="gap-1 border-green-500/30 bg-green-500/10 text-green-400 font-medium">
            <MessageSquare className="size-3" />
            WhatsApp Cloud API
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Multi-Channels & Inbox Switcher"
        description="Connect and manage your messaging channels — WhatsApp Cloud API with dedicated inboxes and instant switching."
      />

      {/* Top Action & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/70 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Radio className="size-5.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Omnichannel Hub</h3>
            <p className="text-xs text-muted-foreground">
              {connections.filter((c) => c.status === 'connected').length} active channel connection(s) configured
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSimModalOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            <Sparkles className="size-3.5" />
            Simulate Inbound Chat
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        {[
          { id: 'all', label: 'All Channels', count: connections.length },
          {
            id: 'whatsapp_cloud',
            label: 'WhatsApp API',
            count: connections.filter((c) => c.channel_type === 'whatsapp_cloud').length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              selectedTab === tab.id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                selectedTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl border border-border bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl p-8 bg-card/20">
          <Radio className="size-10 text-muted-foreground/50 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-foreground">No channel connections yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Connect your official WhatsApp Cloud API to start receiving chats in your unified inbox.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConnections.map((conn) => {
            const isConnected = conn.status === 'connected';

            return (
              <div
                key={conn.id}
                className="flex flex-col justify-between p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                          conn.channel_type === 'telegram'
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                            : conn.channel_type === 'whatsapp_web'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-green-500/10 border-green-500/20 text-green-400'
                        )}
                      >
                        {conn.channel_type === 'telegram' ? (
                          <Send className="size-5.5" />
                        ) : conn.channel_type === 'whatsapp_web' ? (
                          <Smartphone className="size-5.5" />
                        ) : (
                          <MessageSquare className="size-5.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{conn.connection_name}</h4>
                          {conn.is_default && (
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {conn.identifier || conn.metadata?.display_phone_number || conn.metadata?.bot_username || 'Configured'}
                        </p>
                      </div>
                    </div>

                    {getChannelBadge(conn.channel_type)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Status</span>
                      <div className="flex items-center gap-1.5 font-semibold mt-0.5">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          )}
                        />
                        <span className={isConnected ? 'text-emerald-500' : 'text-amber-500'}>
                          {isConnected ? 'Active & Live' : conn.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Channel Type</span>
                      <div className="font-semibold text-foreground mt-0.5 truncate">
                        {conn.channel_type === 'telegram'
                          ? 'Telegram Bot'
                          : conn.channel_type === 'whatsapp_web'
                          ? 'Linked QR Session'
                          : 'Meta Cloud API'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Connected {new Date(conn.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {conn.channel_type === 'whatsapp_web' && !isConnected && (
                      <Button size="sm" variant="outline" onClick={startQrSession} className="h-7 text-xs">
                        Scan QR
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDisconnect(conn.id, conn.connection_name)}
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Web QR Scanner Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <QrCode className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Link WhatsApp via QR Code
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scan the QR code with WhatsApp on your phone (Linked Devices)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            {qrLoading ? (
              <div className="flex flex-col items-center justify-center h-64 w-64 rounded-2xl border border-border bg-muted/30">
                <Loader2 className="size-8 animate-spin text-emerald-400 mb-2" />
                <span className="text-xs text-muted-foreground font-medium">Generating secure QR code...</span>
              </div>
            ) : qrSession?.qrCodeDataUrl ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-border/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSession.qrCodeDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs text-foreground font-medium flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Waiting for device scan...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-destructive">QR code session expired or failed.</p>
                <Button size="sm" variant="outline" onClick={startQrSession} className="mt-2 text-xs">
                  Retry QR Generation
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateScan}
              disabled={qrSimulating || qrLoading}
              className="h-9 text-xs font-semibold gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              {qrSimulating ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
              <span>Simulate Scan & Connect</span>
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={() => setQrModalOpen(false)} className="h-9 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Telegram Setup Modal */}
      <Dialog open={tgModalOpen} onOpenChange={setTgModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Send className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Connect Telegram Channel</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Enter your Telegram Bot Token from @BotFather
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Channel Name</label>
              <Input
                placeholder="e.g. Nexora Support Telegram"
                value={tgName}
                onChange={(e) => setTgName(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Telegram Bot Token</span>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                >
                  Get from @BotFather <ExternalLink className="size-2.5" />
                </a>
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  className="h-9 text-xs bg-background font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifyTelegramToken}
                  disabled={tgVerifying || !tgToken.trim()}
                  className="h-9 text-xs shrink-0"
                >
                  {tgVerifying ? <Loader2 className="size-3.5 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </div>

            {tgBotInfo && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1 text-sky-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-sky-400" />
                  Bot Verified: {tgBotInfo.first_name}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Username: @{tgBotInfo.username} • ID: {tgBotInfo.id}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-end items-center gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTgModalOpen(false)} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTelegram}
              disabled={tgSaving || !tgToken.trim()}
              className="h-9 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white gap-1.5"
            >
              {tgSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Save & Connect</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inbound Simulator Modal */}
      <Dialog open={simModalOpen} onOpenChange={setSimModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Simulate Inbound Customer Chat
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Send a test incoming message to verify multi-channel inbox switching on localhost.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'telegram', label: 'Telegram' },
                  { id: 'whatsapp_web', label: 'WhatsApp Web' },
                  { id: 'whatsapp_cloud', label: 'WhatsApp API' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSimChannel(ch.id as ChannelType);
                      if (ch.id === 'telegram') {
                        setSimSenderPhone('@alex_telegram');
                      } else {
                        setSimSenderPhone('+91 98765 12345');
                      }
                    }}
                    className={cn(
                      'px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center',
                      simChannel === ch.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Customer Name</label>
                <Input
                  value={simSenderName}
                  onChange={(e) => setSimSenderName(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Handle / Phone</label>
                <Input
                  value={simSenderPhone}
                  onChange={(e) => setSimSenderPhone(e.target.value)}
                  className="h-9 text-xs bg-background font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Message Content</label>
              <Input
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end items-center gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSimModalOpen(false)} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRunSimulator}
              disabled={simulating}
              className="h-9 text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600 text-black"
            >
              {simulating ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
              <span>Deliver Test Message</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
