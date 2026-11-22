"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/use-presence";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status";
import { PresenceDot } from "@/components/presence/presence-dot";
import { presenceLabel } from "@/lib/presence";
import { cn } from "@/lib/utils";
import type {
  Contact,
  ConversationStatus,
  InteractiveMessagePayload,
  MessageReaction,
  MessageTemplate,
  Profile,
} from "@/types";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageBubble } from "./message-bubble";
import { MessageActions } from "./message-actions";
import { MediaLightbox } from "./media-lightbox";
import { collectMediaGallery } from "@/lib/media/gallery";
import {
  MessageComposer,
  CHAT_MEDIA_BUCKET,
  type SendMediaPayload,
} from "./message-composer";
import { deleteAccountMedia } from "@/lib/storage/upload-media";
import { TemplatePicker } from "./template-picker";
import { AiThreadBanner } from "./ai-thread-banner";
import { buildReplyPreview } from "./reply-quote";
import { renderTemplateBody } from "@/lib/whatsapp/template-body";
import { useThreadMessages } from "@/lib/inbox/use-thread-messages";
import {
  isTempId,
  messageKey,
  newTempId,
  type ThreadMessage,
} from "@/lib/inbox/messages";
import {
  channelHasCustomerWindow,
  customerWindowState,
  lastCustomerMessageAt,
  type InboxConversation,
} from "@/lib/inbox/session-window";
import {
  isWindowExpiredError,
  postSend,
  sendEndpointFor,
  type SendRequest,
} from "@/lib/inbox/send";
import { useNow } from "@/lib/inbox/use-now";
import { isRealtimeHealthy } from "@/hooks/use-realtime";

interface ReplyDraft {
  id: string;
  authorLabel: string;
  preview: string;
}

export interface MessageThreadProps {
  conversation: InboxConversation | null;
  contact: Contact | null;
  /**
   * Optimistic patch of the page's conversation store (status, assignee,
   * bot flag). The realtime UPDATE converges it afterwards.
   */
  onPatchConversation: (id: string, patch: Partial<InboxConversation>) => void;
  /** Mobile back-to-list. Rendered below `lg` only. */
  onBack?: () => void;
  /** Refetch the conversation list too (thread refetches itself). */
  onRefresh?: () => void;
  contactPanelOpen?: boolean;
  onToggleContactPanel?: () => void;
  /** Conversation-list channel status; combined with the thread's own. */
  isLiveConnected?: boolean;
}

const STATUS_OPTIONS: { value: ConversationStatus; labelKey: string; dot: string }[] = [
  { value: "open", labelKey: "statusOpen", dot: "bg-primary" },
  { value: "pending", labelKey: "statusPending", dot: "bg-amber-500" },
  { value: "closed", labelKey: "statusClosed", dot: "bg-muted-foreground" },
];

/** WhatsApp-style doodle wallpaper behind the thread and its empty state. */
const DOODLE_BG_CLASSES = "bg-background bg-[url('/inbox-doodle.svg')] bg-repeat";

/**
 * Memoised: the page re-renders on every conversation-list event; the open
 * thread only needs to when its own conversation (or a callback) changes.
 */
export const MessageThread = memo(function MessageThread({
  conversation,
  contact,
  onPatchConversation,
  onBack,
  onRefresh,
  contactPanelOpen,
  onToggleContactPanel,
  isLiveConnected = true,
}: MessageThreadProps) {
  const t = useTranslations("Inbox.messageThread");
  const tQuote = useTranslations("Inbox.replyQuote");
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { isGlobalBotPaused } = useWhatsAppStatus();

  const conversationId = conversation?.id ?? null;
  const thread = useThreadMessages(conversationId);
  const {
    messages,
    reactions,
    addOptimistic,
    confirm,
    fail,
    patchMessage,
    discard,
    setReactions,
  } = thread;

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [replyState, setReplyState] = useState<{ convId: string; draft: ReplyDraft } | null>(null);
  // A quote picked in conversation A never bleeds into B.
  const replyTo = replyState && replyState.convId === conversationId ? replyState.draft : null;
  const clearReply = useCallback(() => setReplyState(null), []);

  const [openMedia, setOpenMedia] = useState<{ conversationId: string; messageId: string } | null>(null);
  const mediaMessageId =
    openMedia && openMedia.conversationId === conversationId ? openMedia.messageId : null;

  // Latest values for stable callbacks (bubbles are memoised, so handler
  // identities must not change on every render).
  const latest = useRef({ conversation, userId, messages });
  useEffect(() => {
    latest.current = { conversation, userId, messages };
  });

  // ---- 24h customer service window ---------------------------------------
  const now = useNow();
  const lastCustomerAt = useMemo(
    () => lastCustomerMessageAt(conversation, messages),
    [conversation, messages],
  );
  const hasWindowRule = channelHasCustomerWindow(conversation?.channel_type);
  const windowState = useMemo(
    () =>
      customerWindowState(
        lastCustomerAt,
        now,
        thread.loading ? false : !thread.hasOlder,
      ),
    [lastCustomerAt, now, thread.loading, thread.hasOlder],
  );
  const sessionExpired = hasWindowRule && !thread.loading && windowState.expired;

  // ---- sending -------------------------------------------------------------
  /** Request bodies of unconfirmed sends, for Retry. */
  const sendRequests = useRef(
    new Map<string, { req: SendRequest; mediaPath?: string }>(),
  );

  const dispatch = useCallback(
    async (key: string) => {
      const entry = sendRequests.current.get(key);
      if (!entry) return;
      const result = await postSend(entry.req);
      if (result.ok) {
        sendRequests.current.delete(key);
        confirm(key, { id: result.id, message_id: result.messageId });
        return;
      }
      fail(key, result.error);
      if (isWindowExpiredError(result.code, result.error)) {
        toast.error("24-hour window closed — send a template instead", {
          description: result.error,
          action: { label: "Templates", onClick: () => setTemplateModalOpen(true) },
        });
      } else {
        toast.error("Message not sent", { description: result.error });
      }
    },
    [confirm, fail],
  );

  const sendOptimistic = useCallback(
    (msg: Omit<ThreadMessage, "id" | "status" | "created_at" | "client_key">, req: SendRequest, mediaPath?: string) => {
      const key = newTempId();
      addOptimistic({
        ...msg,
        id: key,
        client_key: key,
        status: "sending",
        created_at: new Date().toISOString(),
      } as ThreadMessage);
      sendRequests.current.set(key, { req, mediaPath });
      void dispatch(key);
    },
    [addOptimistic, dispatch],
  );

  const handleRetry = useCallback(
    (key: string) => {
      if (!sendRequests.current.has(key)) {
        toast.error("This message can't be retried — copy it and send again.");
        return;
      }
      patchMessage(key, { status: "sending", error_message: null });
      void dispatch(key);
    },
    [dispatch, patchMessage],
  );

  const handleDiscard = useCallback(
    (key: string) => {
      const entry = sendRequests.current.get(key);
      sendRequests.current.delete(key);
      // A media upload that was never delivered is garbage — GC it now.
      if (entry?.mediaPath) {
        void deleteAccountMedia(CHAT_MEDIA_BUCKET, entry.mediaPath).catch(() => {});
      }
      discard(key);
    },
    [discard],
  );

  const handleSend = useCallback(
    (text: string, replyToId?: string) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      sendOptimistic(
        {
          conversation_id: conv.id,
          sender_type: "agent",
          sender_id: latest.current.userId ?? undefined,
          content_type: "text",
          content_text: text,
          reply_to_message_id: replyToId,
        },
        {
          endpoint: sendEndpointFor(conv.channel_type),
          body: {
            conversation_id: conv.id,
            message_type: "text",
            content_text: text,
            reply_to_message_id: replyToId,
          },
        },
      );
      setReplyState(null);
    },
    [sendOptimistic],
  );

  const handleSendMedia = useCallback(
    (payload: SendMediaPayload) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      // Documents show their filename in our bubble (and to the recipient as
      // the caption when none was typed); audio carries no caption.
      const contentText =
        payload.kind === "document"
          ? payload.caption || payload.filename || "Document"
          : payload.caption;
      sendOptimistic(
        {
          conversation_id: conv.id,
          sender_type: "agent",
          content_type: payload.kind,
          content_text: contentText,
          media_url: payload.mediaUrl,
          reply_to_message_id: payload.replyToId,
        },
        {
          endpoint: sendEndpointFor(conv.channel_type),
          body: {
            conversation_id: conv.id,
            message_type: payload.kind,
            media_url: payload.mediaUrl,
            content_text: contentText,
            filename: payload.filename,
            reply_to_message_id: payload.replyToId,
          },
        },
        payload.path,
      );
      setReplyState(null);
    },
    [sendOptimistic],
  );

  const handleSendInteractive = useCallback(
    (payload: InteractiveMessagePayload, replyToId?: string) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      sendOptimistic(
        {
          conversation_id: conv.id,
          sender_type: "agent",
          content_type: "interactive",
          content_text: payload.body,
          interactive_payload: payload,
          reply_to_message_id: replyToId,
        },
        {
          endpoint: sendEndpointFor(conv.channel_type),
          body: {
            conversation_id: conv.id,
            message_type: "interactive",
            interactive_payload: payload,
            reply_to_message_id: replyToId,
          },
        },
      );
    },
    [sendOptimistic],
  );

  const handleSendTemplate = useCallback(
    (
      template: MessageTemplate,
      values: { body: string[]; headerText?: string; buttonParams?: Record<number, string> },
    ) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      const renderedBody = renderTemplateBody(template.body_text, values.body);
      sendOptimistic(
        {
          conversation_id: conv.id,
          sender_type: "agent",
          content_type: "template",
          content_text: renderedBody,
          template_name: template.name,
        },
        {
          endpoint: "/api/whatsapp/send",
          body: {
            conversation_id: conv.id,
            message_type: "template",
            template_name: template.name,
            template_language: template.language,
            // Structured params drive the send-builder (header media + URL
            // buttons); body values are mirrored for the legacy fallback.
            template_message_params: {
              body: values.body,
              headerText: values.headerText,
              buttonParams: values.buttonParams,
            },
            template_params: values.body,
            content_text: renderedBody,
          },
        },
      );
    },
    [sendOptimistic],
  );

  const handleOpenTemplates = useCallback(() => setTemplateModalOpen(true), []);

  // ---- replies + reactions ---------------------------------------------------
  const contactDisplayName = contact?.name || contact?.phone || "Customer";
  const meLabel = "You";

  const handleStartReply = useCallback(
    (msg: ThreadMessage) => {
      const convId = latest.current.conversation?.id;
      if (!convId) return;
      if (isTempId(msg.id)) {
        toast.error("Wait for the message to finish sending");
        return;
      }
      const isAgentMsg = msg.sender_type === "agent" || msg.sender_type === "bot";
      setReplyState({
        convId,
        draft: {
          id: msg.id,
          authorLabel: isAgentMsg ? meLabel : contactDisplayName,
          preview: buildReplyPreview(msg, tQuote),
        },
      });
    },
    [contactDisplayName, tQuote],
  );

  const postReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const { conversation: conv, userId: uid } = latest.current;
      if (!uid || !conv) return;
      if (isTempId(messageId)) {
        toast.error("Wait for the message to finish sending");
        return;
      }
      let snapshot: MessageReaction[] = [];
      setReactions((prev) => {
        snapshot = prev;
        const own = prev.find(
          (r) => r.message_id === messageId && r.actor_type === "agent" && r.actor_id === uid,
        );
        if (emoji === "") return own ? prev.filter((r) => r !== own) : prev;
        if (own) return prev.map((r) => (r === own ? { ...own, emoji } : r));
        return [
          ...prev,
          {
            id: newTempId(),
            message_id: messageId,
            conversation_id: conv.id,
            actor_type: "agent",
            actor_id: uid,
            emoji,
            created_at: new Date().toISOString(),
          },
        ];
      });
      try {
        const res = await fetch("/api/whatsapp/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_id: messageId, emoji }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `HTTP ${res.status}`);
        }
      } catch (err) {
        toast.error(`Reaction failed: ${err instanceof Error ? err.message : "network error"}`);
        setReactions(() => snapshot);
      }
    },
    [setReactions],
  );

  const reactionsRef = useRef(reactions);
  useEffect(() => {
    reactionsRef.current = reactions;
  });
  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const uid = latest.current.userId;
      const own = reactionsRef.current.find(
        (r) => r.message_id === messageId && r.actor_type === "agent" && r.actor_id === uid,
      );
      void postReaction(messageId, own?.emoji === emoji ? "" : emoji);
    },
    [postReaction],
  );

  const handleMediaChange = useCallback(
    (messageId: string | null) => {
      const convId = latest.current.conversation?.id;
      setOpenMedia(messageId && convId ? { conversationId: convId, messageId } : null);
    },
    [],
  );

  // ---- conversation actions ----------------------------------------------------
  const updateConversation = useCallback(
    async (patch: Partial<InboxConversation>, failMessage: string) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      const rollback: Partial<InboxConversation> = {};
      for (const k of Object.keys(patch) as (keyof InboxConversation)[]) {
        (rollback as Record<string, unknown>)[k] = conv[k] ?? null;
      }
      onPatchConversation(conv.id, patch);
      const { error } = await createClient()
        .from("conversations")
        .update(patch)
        .eq("id", conv.id);
      if (error) {
        console.error(failMessage, error);
        toast.error(failMessage, { description: error.message });
        onPatchConversation(conv.id, rollback);
      }
    },
    [onPatchConversation],
  );

  const handleStatusChange = useCallback(
    (status: ConversationStatus) => {
      void updateConversation({ status }, "Failed to update status");
    },
    [updateConversation],
  );

  const handleAssignChange = useCallback(
    (agentId: string | null) => {
      // `null` (not undefined) so "Unassign" actually reaches the DB —
      // JSON drops undefined keys, which made the update a silent no-op.
      void updateConversation(
        { assigned_agent_id: agentId } as unknown as Partial<InboxConversation>,
        "Failed to update assignment",
      );
    },
    [updateConversation],
  );

  const [botToggling, setBotToggling] = useState(false);
  const isBotPaused = Boolean(conversation?.ai_autoreply_disabled);
  const handleToggleBotAutomation = useCallback(async () => {
    const conv = latest.current.conversation;
    if (!conv) return;
    if (isGlobalBotPaused) {
      toast.info(
        "Global Bot Reply is OFF (100% Human Agent Mode). Turn it on from Bot Reply settings.",
        { action: { label: "Bot Reply", onClick: () => { window.location.href = "/bot-reply"; } } },
      );
      return;
    }
    setBotToggling(true);
    const nextPaused = !conv.ai_autoreply_disabled;
    try {
      const res = await fetch(`/api/ai/autoreply/${conv.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: nextPaused, assign_to_me: nextPaused }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to toggle bot");
        return;
      }
      // Patch BOTH fields locally — previously only the assignee was
      // patched, so the header kept saying "Bot: Active" until (or unless)
      // the realtime UPDATE arrived.
      onPatchConversation(conv.id, {
        ai_autoreply_disabled: nextPaused,
        assigned_agent_id: (nextPaused
          ? (latest.current.userId ?? conv.assigned_agent_id ?? null)
          : null) as string | undefined,
      });
      toast.success(nextPaused ? "Bot paused — you're handling this chat" : "Bot & automations resumed");
    } catch {
      toast.error("Network error while toggling bot");
    } finally {
      setBotToggling(false);
    }
  }, [isGlobalBotPaused, onPatchConversation]);

  const handleBannerChange = useCallback(
    (patch: { ai_autoreply_disabled: boolean; assigned_agent_id?: string | null }) => {
      const conv = latest.current.conversation;
      if (!conv) return;
      onPatchConversation(conv.id, {
        ai_autoreply_disabled: patch.ai_autoreply_disabled,
        ...("assigned_agent_id" in patch
          ? { assigned_agent_id: (patch.assigned_agent_id ?? null) as string | undefined }
          : {}),
      });
    },
    [onPatchConversation],
  );

  const threadResync = thread.resync;
  const handleRefresh = useCallback(() => {
    threadResync();
    onRefresh?.();
  }, [threadResync, onRefresh]);

  const mediaGallery = useMemo(() => collectMediaGallery(messages), [messages]);

  // ---- render ---------------------------------------------------------------------
  if (!conversation) {
    return (
      <div className={cn("relative flex flex-1 flex-col items-center justify-center px-6 text-center", DOODLE_BG_CLASSES)}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("backToConversations")}
            className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-xs hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-xs">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">{t("selectConversation")}</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t("selectConversationHint")}</p>
      </div>
    );
  }

  const displayName = contact?.name || contact?.phone || "Unknown";
  const live = isLiveConnected && isRealtimeHealthy(thread.status);

  return (
    // `min-w-0` (issue #257): a long unbroken URL must not widen the thread
    // past its flex share and paint over the contact sidebar.
    <div className={cn("relative flex h-full min-w-0 flex-1 flex-col", DOODLE_BG_CLASSES)}>
      <ThreadHeader
        t={t}
        conversation={conversation}
        displayName={displayName}
        subtitle={contact?.phone ?? ""}
        avatarUrl={contact?.avatar_url}
        onBack={onBack}
        hasWindowRule={hasWindowRule}
        windowExpired={sessionExpired}
        windowExpiresAt={windowState.expiresAt}
        windowLoading={thread.loading}
        now={now}
        live={live}
        isGlobalBotPaused={isGlobalBotPaused}
        isBotPaused={isBotPaused}
        botToggling={botToggling}
        onToggleBot={handleToggleBotAutomation}
        onStatusChange={handleStatusChange}
        onAssignChange={handleAssignChange}
        currentUserId={userId}
        onRefresh={handleRefresh}
        contactPanelOpen={contactPanelOpen}
        onToggleContactPanel={onToggleContactPanel}
      />

      {/* Keyed by conversation: scroll position, "new messages" pill and
          pagination anchors reset cleanly on every switch. */}
      <ThreadMessages
        key={conversation.id}
        messages={messages}
        reactions={reactions}
        loading={thread.loading}
        error={thread.error}
        hasOlder={thread.hasOlder}
        loadingOlder={thread.loadingOlder}
        onLoadOlder={thread.loadOlder}
        onRetryLoad={thread.resync}
        userId={userId}
        contactLabel={contactDisplayName}
        meLabel={meLabel}
        tQuote={tQuote}
        t={t}
        onReply={handleStartReply}
        onReact={postReaction}
        onToggleReaction={handleToggleReaction}
        onOpenMedia={handleMediaChange}
        onRetry={handleRetry}
        onDiscard={handleDiscard}
      />

      <AiThreadBanner
        conversationId={conversation.id}
        disabled={conversation.ai_autoreply_disabled ?? false}
        handoffSummary={conversation.ai_handoff_summary}
        assignedAgentId={conversation.assigned_agent_id ?? null}
        currentUserId={userId}
        onChange={handleBannerChange}
        isGlobalBotPaused={isGlobalBotPaused}
      />

      <MessageComposer
        key={conversation.id}
        conversationId={conversation.id}
        sessionExpired={sessionExpired}
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onSendInteractive={handleSendInteractive}
        onOpenTemplates={handleOpenTemplates}
        replyTo={replyTo}
        onClearReply={clearReply}
      />

      <TemplatePicker
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSelect={handleSendTemplate}
      />

      <MediaLightbox
        items={mediaGallery}
        activeId={mediaMessageId}
        onActiveIdChange={handleMediaChange}
        contactLabel={contactDisplayName}
      />
    </div>
  );
});

// ============================================================================
// Header
// ============================================================================

type Translator = ReturnType<typeof useTranslations>;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Closed";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}

interface ThreadHeaderProps {
  t: Translator;
  conversation: InboxConversation;
  displayName: string;
  subtitle: string;
  avatarUrl?: string;
  onBack?: () => void;
  hasWindowRule: boolean;
  windowExpired: boolean;
  windowExpiresAt: number | null;
  windowLoading: boolean;
  now: number;
  live: boolean;
  isGlobalBotPaused: boolean;
  isBotPaused: boolean;
  botToggling: boolean;
  onToggleBot: () => void;
  onStatusChange: (status: ConversationStatus) => void;
  onAssignChange: (agentId: string | null) => void;
  currentUserId: string | null;
  onRefresh: () => void;
  contactPanelOpen?: boolean;
  onToggleContactPanel?: () => void;
}

const ThreadHeader = memo(function ThreadHeader({
  t,
  conversation,
  displayName,
  subtitle,
  avatarUrl,
  onBack,
  hasWindowRule,
  windowExpired,
  windowExpiresAt,
  windowLoading,
  now,
  live,
  isGlobalBotPaused,
  isBotPaused,
  botToggling,
  onToggleBot,
  onStatusChange,
  onAssignChange,
  currentUserId,
  onRefresh,
  contactPanelOpen,
  onToggleContactPanel,
}: ThreadHeaderProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );
  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    onRefresh();
    refreshTimer.current = setTimeout(() => setRefreshing(false), 700);
  };

  const status = conversation.status;
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const resolved = status === "closed";
  const channel = conversation.channel_type;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-card px-2 py-2 sm:gap-2 sm:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("backToConversations")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft-2 text-sm font-semibold text-primary">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-9 w-9 object-cover" />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold text-foreground">{displayName}</h2>
          {channel === "telegram" ? (
            <Send className="h-3 w-3 shrink-0 text-sky-500" aria-label="Telegram" />
          ) : channel === "whatsapp_web" ? (
            <Smartphone className="h-3 w-3 shrink-0 text-emerald-500" aria-label="WhatsApp Web" />
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate">{subtitle}</span>
          {hasWindowRule && !windowLoading && (
            <span
              title={
                windowExpired
                  ? "24-hour customer service window closed — only templates can be sent"
                  : "Time left in the 24-hour customer service window"
              }
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px font-medium",
                windowExpired
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary-soft text-primary",
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              {windowExpired
                ? "Window closed"
                : windowExpiresAt
                  ? formatRemaining(windowExpiresAt - now)
                  : "Open"}
            </span>
          )}
          {!live && (
            <span className="inline-flex shrink-0 items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              <span className="hidden sm:inline">Reconnecting…</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          onClick={onToggleBot}
          disabled={botToggling}
          title={
            isGlobalBotPaused
              ? "Global bot is off (100% human agent mode)"
              : isBotPaused
                ? "Bot paused here — click to resume automations"
                : "Bot active here — click to pause and take over"
          }
          className={cn(
            "hidden h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors md:inline-flex",
            isGlobalBotPaused || isBotPaused
              ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
              : "border-border bg-muted/60 text-foreground hover:bg-muted",
          )}
        >
          {botToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span
              className={cn(
                "size-2 rounded-full",
                isGlobalBotPaused || isBotPaused ? "bg-amber-500" : "bg-primary",
              )}
            />
          )}
          {isGlobalBotPaused ? "Bot off" : isBotPaused ? "Bot paused" : "Bot on"}
        </button>

        <button
          type="button"
          onClick={() => onStatusChange(resolved ? "open" : "closed")}
          title={resolved ? "Reopen conversation" : "Mark as resolved"}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors sm:px-2.5",
            resolved
              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{resolved ? "Reopen" : "Resolve"}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("status")}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className={cn("size-2 rounded-full", currentStatus?.dot ?? "bg-muted-foreground")} />
            <span className="hidden sm:inline">
              {currentStatus ? t(currentStatus.labelKey) : t("status")}
            </span>
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-popover">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className="gap-2 text-sm"
              >
                <span className={cn("size-2 rounded-full", opt.dot)} />
                <span className="flex-1">{t(opt.labelKey)}</span>
                {opt.value === status && <Check className="h-3 w-3 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <AssignMenu
          t={t}
          assignedAgentId={conversation.assigned_agent_id ?? null}
          currentUserId={currentUserId}
          onAssignChange={onAssignChange}
        />

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={t("refreshConversation")}
          title={t("refresh")}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60 sm:inline-flex"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>

        {onToggleContactPanel && (
          <button
            type="button"
            onClick={onToggleContactPanel}
            aria-label={contactPanelOpen ? t("hideContactPanel") : t("showContactPanel")}
            title={contactPanelOpen ? t("hideContact") : t("showContact")}
            aria-pressed={contactPanelOpen}
            className={cn(
              "hidden h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground xl:inline-flex",
              contactPanelOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            {contactPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
});

// Teammates rarely change during a session; fetch once per page load.
let profilesPromise: Promise<Profile[]> | null = null;
function loadProfiles(): Promise<Profile[]> {
  profilesPromise ??= (async () => {
    const { data, error } = await createClient()
      .from("profiles")
      .select("*")
      .order("full_name");
    if (error) {
      profilesPromise = null;
      throw error;
    }
    return (data as Profile[]) ?? [];
  })();
  return profilesPromise;
}

/**
 * Assignee picker. Owns the presence subscription so its 15-second
 * re-derive tick re-renders only this menu — previously `usePresence` lived
 * in the thread and re-rendered every bubble four times a minute. Presence
 * is only subscribed while the menu is open.
 */
function AssignMenu({
  t,
  assignedAgentId,
  currentUserId,
  onAssignChange,
}: {
  t: Translator;
  assignedAgentId: string | null;
  currentUserId: string | null;
  onAssignChange: (agentId: string | null) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const { getPresence, getRow, now } = usePresence(open);

  useEffect(() => {
    let cancelled = false;
    loadProfiles()
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .catch((err) => console.error("Failed to fetch profiles:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const currentAssignee = profiles.find((p) => p.user_id === assignedAgentId);
  const label = assignedAgentId
    ? assignedAgentId === currentUserId
      ? "You"
      : (currentAssignee?.full_name ?? t("assigned"))
    : t("assign");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        title={assignedAgentId ? `Assigned to ${label}` : t("assign")}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs hover:bg-muted",
          assignedAgentId ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span className="hidden max-w-24 truncate sm:inline">{label}</span>
        <ChevronDown className="hidden h-3 w-3 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
        {currentUserId && assignedAgentId !== currentUserId && (
          <>
            <DropdownMenuItem onClick={() => onAssignChange(currentUserId)} className="text-sm font-medium">
              Assign to me
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}
        {profiles.length === 0 ? (
          <DropdownMenuItem disabled className="text-sm text-muted-foreground">
            {t("noTeammates")}
          </DropdownMenuItem>
        ) : (
          profiles.map((p) => {
            const selected = p.user_id === assignedAgentId;
            const presence = getPresence(p.user_id);
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onAssignChange(p.user_id)}
                className={cn("text-sm", selected ? "text-primary" : "text-popover-foreground")}
              >
                <PresenceDot
                  status={presence}
                  label={presenceLabel(presence, getRow(p.user_id)?.last_seen_at ?? null, now)}
                  className="mr-2"
                />
                <span className="flex-1 truncate">
                  {p.full_name}
                  {p.user_id === currentUserId ? t("me") : ""}
                </span>
                {selected && <Check className="ml-2 h-3 w-3" />}
              </DropdownMenuItem>
            );
          })
        )}
        {assignedAgentId && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => onAssignChange(null)} className="text-sm text-muted-foreground">
              {t("unassign")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Message list
// ============================================================================

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateSeparator(iso: string, t: Translator): string {
  const date = new Date(iso);
  if (isToday(date)) return t("today");
  if (isYesterday(date)) return t("yesterday");
  return format(date, "EEEE, MMMM d, yyyy");
}

/** Distance from the bottom (px) still treated as "following the chat". */
const NEAR_BOTTOM_PX = 120;
/** Start fetching older history this close to the top. */
const LOAD_OLDER_PX = 300;

type ThreadItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: string; message: ThreadMessage; firstInGroup: boolean };

interface ThreadMessagesProps {
  messages: ThreadMessage[];
  reactions: MessageReaction[];
  loading: boolean;
  error: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetryLoad: () => void;
  userId: string | null;
  contactLabel: string;
  meLabel: string;
  t: Translator;
  tQuote: Translator;
  onReply: (msg: ThreadMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenMedia: (messageId: string | null) => void;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
}

const ThreadMessages = memo(function ThreadMessages({
  messages,
  reactions,
  loading,
  error,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onRetryLoad,
  userId,
  contactLabel,
  meLabel,
  t,
  tQuote,
  onReply,
  onReact,
  onToggleReaction,
  onOpenMedia,
  onRetry,
  onDiscard,
}: ThreadMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll bookkeeping lives in refs (read in layout effects / handlers);
  // only the pill needs state, and it only changes on real transitions.
  const atBottomRef = useRef(true);
  const [follow, setFollow] = useState<{ atBottom: boolean; seenKey: string | null }>({
    atBottom: true,
    seenKey: null,
  });

  const items = useMemo<ThreadItem[]>(() => {
    const out: ThreadItem[] = [];
    let lastDay = "";
    let prev: ThreadMessage | null = null;
    for (const m of messages) {
      const day = dayKey(m.created_at);
      if (day !== lastDay) {
        out.push({ kind: "day", key: `day-${day}`, label: formatDateSeparator(m.created_at, t) });
        lastDay = day;
        prev = null;
      }
      const sameSide =
        prev &&
        (prev.sender_type === "customer") === (m.sender_type === "customer");
      out.push({ kind: "msg", key: messageKey(m), message: m, firstInGroup: !sameSide });
      prev = m;
    }
    return out;
  }, [messages, t]);

  const byId = useMemo(() => {
    const map = new Map<string, ThreadMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, MessageReaction[]>();
    for (const r of reactions) {
      const bucket = map.get(r.message_id);
      if (bucket) bucket.push(r);
      else map.set(r.message_id, [r]);
    }
    return map;
  }, [reactions]);

  const lastKey = messages.length ? messageKey(messages[messages.length - 1]) : null;
  const firstKey = messages.length ? messageKey(messages[0]) : null;

  // ---- scroll management (runs before paint, so no visible jumps) ----------
  const prevRef = useRef<{ firstKey: string | null; lastKey: string | null; height: number; top: number }>({
    firstKey: null,
    lastKey: null,
    height: 0,
    top: 0,
  });

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = true;
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = prevRef.current;

    if (prev.lastKey === null && lastKey !== null) {
      // First paint of this conversation: start at the newest message.
      el.scrollTop = el.scrollHeight;
      atBottomRef.current = true;
    } else if (prev.firstKey !== null && firstKey !== prev.firstKey && prev.lastKey === lastKey) {
      // Older history was prepended: keep the same message under the eye.
      el.scrollTop = prev.top + (el.scrollHeight - prev.height);
    } else if (lastKey !== prev.lastKey && lastKey !== null) {
      const last = messages[messages.length - 1];
      const ownJustSent = !!last.client_key && last.status === "sending";
      if (atBottomRef.current || ownJustSent) {
        el.scrollTop = el.scrollHeight;
        atBottomRef.current = true;
      }
    }

    prevRef.current = { firstKey, lastKey, height: el.scrollHeight, top: el.scrollTop };
  }, [firstKey, lastKey, messages]);

  // Keep pinned to the bottom while images/media finish loading and grow
  // the content, as long as the agent hasn't scrolled away.
  useEffect(() => {
    const content = contentRef.current;
    const el = scrollRef.current;
    if (!content || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
      prevRef.current.height = el.scrollHeight;
      prevRef.current.top = el.scrollTop;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // If the first page doesn't fill the viewport, pull more history.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || !hasOlder || loadingOlder) return;
    if (el.scrollHeight <= el.clientHeight + LOAD_OLDER_PX) onLoadOlder();
  }, [loading, hasOlder, loadingOlder, messages.length, onLoadOlder]);

  const lastKeyRef = useRef(lastKey);
  const onLoadOlderRef = useRef(onLoadOlder);
  useEffect(() => {
    lastKeyRef.current = lastKey;
    onLoadOlderRef.current = onLoadOlder;
  });

  const rafRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      atBottomRef.current = atBottom;
      prevRef.current.top = el.scrollTop;
      prevRef.current.height = el.scrollHeight;
      setFollow((f) => {
        // At the bottom (or just leaving it) the agent has seen everything
        // up to the current last message; count unseen from there.
        const seenKey =
          atBottom || f.atBottom ? lastKeyRef.current : f.seenKey;
        return f.atBottom === atBottom && f.seenKey === seenKey ? f : { atBottom, seenKey };
      });
      if (el.scrollTop < LOAD_OLDER_PX) onLoadOlderRef.current();
    });
  }, []);

  // Unseen inbound messages since the agent scrolled away from the bottom.
  const unseen = useMemo(() => {
    if (follow.atBottom || !follow.seenKey) return 0;
    let count = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (messageKey(m) === follow.seenKey) return count;
      if (m.sender_type === "customer") count++;
    }
    return 0;
  }, [follow, messages]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // We restore scroll positions ourselves; browser scroll anchoring
        // would double-apply the offset on prepend (and Safari lacks it).
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none] sm:px-6"
      >
        <div ref={contentRef} className="mx-auto flex max-w-3xl flex-col">
          {hasOlder && (
            <div className="flex justify-center py-2">
              {loadingOlder ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  type="button"
                  onClick={onLoadOlder}
                  className="rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-xs hover:text-foreground"
                >
                  Load earlier messages
                </button>
              )}
            </div>
          )}

          {loading && messages.length === 0 ? (
            <ThreadSkeleton />
          ) : error && messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load messages.</p>
              <button
                type="button"
                onClick={onRetryLoad}
                className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xs rounded-xl bg-card/90 px-4 py-3 text-center shadow-xs">
              <p className="text-sm text-foreground">{t("noMessagesYet")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("sendTemplateHint")}</p>
            </div>
          ) : (
            items.map((item) =>
              item.kind === "day" ? (
                <div key={item.key} className="sticky top-0 z-[1] my-3 flex justify-center">
                  <span className="rounded-full bg-card/95 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-xs backdrop-blur">
                    {item.label}
                  </span>
                </div>
              ) : (
                <MessageRow
                  key={item.key}
                  message={item.message}
                  firstInGroup={item.firstInGroup}
                  parent={
                    item.message.reply_to_message_id
                      ? byId.get(item.message.reply_to_message_id)
                      : undefined
                  }
                  reactions={reactionsByMessage.get(item.message.id)}
                  userId={userId}
                  contactLabel={contactLabel}
                  meLabel={meLabel}
                  tQuote={tQuote}
                  onReply={onReply}
                  onReact={onReact}
                  onToggleReaction={onToggleReaction}
                  onOpenMedia={onOpenMedia}
                  onRetry={onRetry}
                  onDiscard={onDiscard}
                />
              ),
            )
          )}
        </div>
      </div>

      {!follow.atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label={unseen > 0 ? `${unseen} new messages` : "Scroll to latest"}
          className={cn(
            "absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-md transition-colors hover:bg-muted sm:right-6",
            unseen > 0 ? "text-primary" : "text-muted-foreground",
          )}
        >
          {unseen > 0 && <span>{unseen > 99 ? "99+" : unseen} new</span>}
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-hidden>
      {[60, 40, 70, 35, 55].map((w, i) => (
        <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
          <div className="h-10 animate-pulse rounded-2xl bg-card/80" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

interface MessageRowProps {
  message: ThreadMessage;
  firstInGroup: boolean;
  parent?: ThreadMessage;
  reactions?: MessageReaction[];
  userId: string | null;
  contactLabel: string;
  meLabel: string;
  tQuote: Translator;
  onReply: (msg: ThreadMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenMedia: (messageId: string | null) => void;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
}

/**
 * One message. Memoised with stable callbacks from the thread, so a new
 * message, a status tick, or a keystroke in the composer re-renders only
 * the row whose data actually changed.
 */
const MessageRow = memo(function MessageRow({
  message,
  firstInGroup,
  parent,
  reactions,
  userId,
  contactLabel,
  meLabel,
  tQuote,
  onReply,
  onReact,
  onToggleReaction,
  onOpenMedia,
  onRetry,
  onDiscard,
}: MessageRowProps) {
  const id = message.id;
  const key = messageKey(message);

  const reply = useMemo(() => {
    if (!parent) return null;
    const mine = parent.sender_type === "agent" || parent.sender_type === "bot";
    return {
      authorLabel: mine ? meLabel : contactLabel,
      preview: buildReplyPreview(parent, tQuote),
    };
  }, [parent, meLabel, contactLabel, tQuote]);

  const handleReply = useCallback(() => onReply(message), [onReply, message]);
  const handleReact = useCallback(
    (emoji: string) => {
      if (emoji) onReact(id, emoji);
    },
    [onReact, id],
  );
  const handleToggle = useCallback((emoji: string) => onToggleReaction(id, emoji), [onToggleReaction, id]);
  const handleRetry = useCallback(() => onRetry(key), [onRetry, key]);
  const handleDiscard = useCallback(() => onDiscard(key), [onDiscard, key]);
  const failed = message.status === "failed" && !!message.client_key;

  return (
    <div className={firstInGroup ? "mt-3" : "mt-0.5"}>
      <MessageActions message={message} onReply={handleReply} onReact={handleReact}>
        <MessageBubble
          message={message}
          reply={reply}
          reactions={reactions}
          currentUserId={userId ?? undefined}
          onToggleReaction={handleToggle}
          onOpenMedia={onOpenMedia}
          onRetry={failed ? handleRetry : undefined}
          onDiscard={failed ? handleDiscard : undefined}
        />
      </MessageActions>
    </div>
  );
});
