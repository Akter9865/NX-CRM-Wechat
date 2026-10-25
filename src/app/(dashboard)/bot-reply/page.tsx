'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BotMessageSquare,
  Bot,
  UserCheck,
  Power,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Phone,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface WhatsAppConn {
  id: string;
  name: string;
  phone: string;
  is_default: boolean;
  status?: string;
  bot_active: boolean;
}

interface PausedChat {
  id: string;
  status: string;
  last_message_text?: string;
  last_message_at?: string;
  updated_at?: string;
  handoff_summary?: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    avatar_url?: string;
  } | null;
}

export default function BotReplyPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [globalBotActive, setGlobalBotActive] = useState<boolean>(true);
  const [isPartiallyPaused, setIsPartiallyPaused] = useState<boolean>(false);
  const [pausedCount, setPausedCount] = useState<number>(0);
  const [totalConversations, setTotalConversations] = useState<number>(0);
  const [activeAutomations, setActiveAutomations] = useState<number>(0);
  const [connections, setConnections] = useState<WhatsAppConn[]>([]);
  const [pausedConversations, setPausedConversations] = useState<PausedChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unpauseAllOnGlobalResume, setUnpauseAllOnGlobalResume] = useState(true);

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/bot-reply', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load bot reply status');
      const data = await res.json();

      setGlobalBotActive(Boolean(data.global_bot_active));
      setIsPartiallyPaused(Boolean(data.is_partially_paused));
      setPausedCount(data.paused_conversations_count || 0);
      setTotalConversations(data.total_conversations_count || 0);
      setActiveAutomations(data.active_automations_count || 0);
      setConnections(data.connections || []);
      setPausedConversations(data.paused_conversations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching status';
      if (!isSilent) toast.error(msg);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Master Global Switch Handler
  const handleToggleGlobal = async (nextActive: boolean) => {
    setActionLoading('global_toggle');
    try {
      const res = await fetch('/api/bot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_global',
          active: nextActive,
          unpause_all_chats: nextActive && unpauseAllOnGlobalResume,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update global bot status');

      setGlobalBotActive(nextActive);
      toast.success(
        nextActive
          ? 'Bot auto-reply turned ON globally!'
          : 'Bot auto-reply turned OFF. Switched to 100% Human Agent Mode.'
      );
      await fetchStatus(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle global bot';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Single Connection
  const handleToggleConnection = async (connId: string, currentActive: boolean) => {
    setActionLoading(`conn_${connId}`);
    try {
      const res = await fetch('/api/bot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_connection',
          connection_id: connId,
          active: !currentActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update connection bot status');

      toast.success(!currentActive ? 'Bot activated for this number' : 'Bot paused for this number');
      await fetchStatus(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update connection';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Batch: Resume all individual chats
  const handleResumeAllChats = async () => {
    setActionLoading('resume_all');
    try {
      const res = await fetch('/api/bot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_all_chats' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resume all chats');

      toast.success('All customer chats resumed! Bot is now active on all threads.');
      await fetchStatus(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume all chats';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Batch: Pause all individual chats (Human takeover across all)
  const handlePauseAllChats = async () => {
    setActionLoading('pause_all');
    try {
      const res = await fetch('/api/bot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause_all_chats' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pause all chats');

      toast.success('All chats switched to Human Agent Mode.');
      await fetchStatus(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pause all chats';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Single Chat Resume
  const handleResumeChat = async (convId: string) => {
    setActionLoading(`chat_${convId}`);
    try {
      const res = await fetch('/api/bot-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_chat',
          conversation_id: convId,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resume chat');

      toast.success('Bot resumed for this conversation');
      setPausedConversations((prev) => prev.filter((c) => c.id !== convId));
      setPausedCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume chat';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered paused conversations
  const filteredPausedChats = useMemo(() => {
    if (!searchQuery.trim()) return pausedConversations;
    const q = searchQuery.toLowerCase().trim();
    return pausedConversations.filter(
      (c) =>
        c.contact?.name?.toLowerCase().includes(q) ||
        c.contact?.phone?.includes(q) ||
        c.last_message_text?.toLowerCase().includes(q)
    );
  }, [pausedConversations, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/20 text-white">
            <BotMessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Bot Reply Control Center
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5 border shrink-0',
                  globalBotActive
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full mr-1.5 shrink-0',
                    globalBotActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  )}
                />
                {globalBotActive ? 'Global Bot Active' : '100% Human Mode'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Master control for automated replies. Toggle global bot replies permanently or manage per-chat human takeovers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus()}
            disabled={loading}
            className="h-9 gap-1.5 flex-1 sm:flex-initial"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
          <Link
            href="/inbox"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'h-9 gap-1.5 bg-primary text-primary-foreground flex-1 sm:flex-initial'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Go to Inbox</span>
          </Link>
        </div>
      </div>

      {/* Master Global Switch Hero Card */}
      <Card
        className={cn(
          'relative overflow-hidden border-2 transition-all shadow-md',
          globalBotActive
            ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent'
            : 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent'
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl font-semibold',
                    globalBotActive
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  )}
                >
                  <Power className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {globalBotActive
                      ? 'Global Bot Auto-Reply is ON'
                      : 'Global Bot Auto-Reply is OFF (100% Human Agent Mode)'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Permanent master control across all connected WhatsApp numbers
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed pt-1">
                {globalBotActive ? (
                  <span>
                    When active, incoming customer inquiries trigger automated Flows, Keyword rules, and AI replies. Individual customer chats can still be paused manually whenever a human agent needs to step in.
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-300 font-medium">
                    Human Agent Mode is active. <strong>NO automated bot replies will be sent to any customer inquiries.</strong> Every incoming message will wait quietly for human agents to reply manually in the Inbox.
                  </span>
                )}
              </p>

              {!globalBotActive && (
                <div className="flex items-center gap-2 pt-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={unpauseAllOnGlobalResume}
                      onChange={(e) => setUnpauseAllOnGlobalResume(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>When turning ON, also re-enable bot on all individually paused chats</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-background/80 shadow-sm">
                <Switch
                  id="master-bot-switch"
                  checked={globalBotActive}
                  disabled={actionLoading === 'global_toggle'}
                  onCheckedChange={handleToggleGlobal}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <label
                  htmlFor="master-bot-switch"
                  className="text-sm font-semibold cursor-pointer select-none"
                >
                  {globalBotActive ? 'Bot Active (Auto)' : 'Bot Disabled (Human Only)'}
                </label>
              </div>

              <Button
                size="lg"
                variant={globalBotActive ? 'destructive' : 'default'}
                disabled={actionLoading === 'global_toggle'}
                onClick={() => handleToggleGlobal(!globalBotActive)}
                className={cn(
                  'font-semibold shadow-md gap-2 w-full sm:w-auto',
                  !globalBotActive && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
              >
                {globalBotActive ? (
                  <>
                    <Square className="h-4 w-4 fill-current" />
                    <span>Turn OFF Bot (Human Mode)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Turn ON Bot (Automated)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="border bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Global Bot State
            </CardTitle>
            <Bot
              className={cn(
                'h-4 w-4',
                globalBotActive ? 'text-emerald-500' : 'text-amber-500'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {globalBotActive ? 'Active' : 'Disabled'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {globalBotActive ? 'Automations & AI live' : '100% Human Agent Mode'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paused Customer Chats
            </CardTitle>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">{pausedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chats assigned to human agents
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Flows & Automations
            </CardTitle>
            <Sparkles className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">{activeAutomations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {globalBotActive ? 'Triggering on new inquiries' : 'Paused by Master Switch'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              WhatsApp Channels
            </CardTitle>
            <Phone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">{connections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected phone number(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected WhatsApp Numbers */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Connected WhatsApp Numbers
              </CardTitle>
              <CardDescription className="text-xs">
                Per-number bot reply switches. Disabling a number stops automations only for that specific channel.
              </CardDescription>
            </div>
            <Link
              href="/settings?tab=whatsapp"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Manage Numbers in Settings</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No WhatsApp numbers connected yet. Connect one in{' '}
              <Link href="/settings?tab=whatsapp" className="text-primary underline">
                Settings → WhatsApp
              </Link>
              .
            </div>
          ) : (
            <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card/40">
              {connections.map((conn) => {
                const isBanned = conn.status === 'banned';
                const isRestricted = conn.status === 'restricted';
                return (
                  <div
                    key={conn.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground/80 font-bold">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {conn.name}
                          </span>
                          {conn.is_default && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              Default
                            </Badge>
                          )}
                          {isBanned ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold animate-pulse">
                              Meta API Banned
                            </Badge>
                          ) : isRestricted ? (
                            <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5">
                              Meta API Restricted
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 px-1.5 border-emerald-500/30">
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{conn.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-foreground">
                          {conn.bot_active ? 'Bot Active' : 'Bot Paused'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {conn.bot_active ? 'Auto-replies live' : 'Human agent required'}
                        </div>
                      </div>

                      <Switch
                        checked={conn.bot_active}
                        disabled={actionLoading === `conn_${conn.id}` || isBanned}
                        onCheckedChange={() => handleToggleConnection(conn.id, conn.bot_active)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paused Customer Chats Section (Per-chat Human Mode list) */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground">
                  Chats in Human Agent Mode ({pausedCount})
                </CardTitle>
                {pausedCount > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]">
                    Bot Paused on {pausedCount} {pausedCount === 1 ? 'chat' : 'chats'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                These specific customer conversations were paused by an agent or handed off. Bots will not reply to them.
              </CardDescription>
            </div>

            {/* Batch Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseAllChats}
                disabled={actionLoading === 'pause_all'}
                className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground flex-1 sm:flex-initial"
              >
                <UserCheck className="h-3 w-3" />
                <span>Pause All Chats</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleResumeAllChats}
                disabled={actionLoading === 'resume_all' || pausedCount === 0}
                className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Resume Bot on All</span>
              </Button>
            </div>
          </div>

          {/* Search box if there are chats */}
          {pausedConversations.length > 0 && (
            <div className="pt-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search paused chats by name, phone, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {pausedConversations.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-card/20">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No conversations are paused
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                {globalBotActive
                  ? 'All customer conversations are running with automated bot replies. When an agent clicks "Take Over" in Inbox, that chat will appear here.'
                  : 'Global Bot Reply is currently OFF, so all incoming inquiries are handled by human agents.'}
              </p>
            </div>
          ) : filteredPausedChats.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No paused conversations match your search.
            </div>
          ) : (
            <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card/40">
              {filteredPausedChats.map((chat) => {
                const contactName = chat.contact?.name || 'Unknown Contact';
                const contactPhone = chat.contact?.phone || 'No phone';
                const isResuming = actionLoading === `chat_${chat.id}`;

                return (
                  <div
                    key={chat.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase">
                        {contactName.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {contactName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {contactPhone}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          >
                            Human Agent Mode
                          </Badge>
                        </div>

                        {chat.last_message_text && (
                          <p className="text-xs text-foreground/80 truncate max-w-md sm:max-w-xl mt-0.5">
                            {chat.last_message_text}
                          </p>
                        )}

                        {chat.handoff_summary && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 truncate max-w-md sm:max-w-xl mt-0.5">
                            Note: {chat.handoff_summary}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {chat.last_message_at
                              ? `${formatDistanceToNow(new Date(chat.last_message_at))} ago`
                              : 'No recent activity'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeChat(chat.id)}
                        disabled={isResuming}
                        className="h-8 text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-500/30 flex-1 sm:flex-initial"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Resume Bot</span>
                      </Button>

                      <Link
                        href={`/inbox?c=${chat.id}`}
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'sm' }),
                          'h-8 text-xs gap-1 text-foreground/80 hover:text-foreground flex-1 sm:flex-initial justify-center'
                        )}
                      >
                        <span>Open in Inbox</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
