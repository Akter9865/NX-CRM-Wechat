"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Sparkles, Hand, Undo2, Loader2, BotOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AiThreadBannerProps {
  conversationId: string;
  /** `conversations.ai_autoreply_disabled` — bot paused on this thread. */
  disabled: boolean;
  /** `conversations.ai_handoff_summary` — note the bot left on handoff. */
  handoffSummary?: string | null;
  /** Current assignee; when a human owns the thread the bot won't run,
   *  so the "AI active" banner is suppressed. */
  assignedAgentId?: string | null;
  /** The acting agent — "Take over" assigns the thread to them. */
  currentUserId?: string | null;
  /** Called after a successful toggle so the parent can patch its local
   *  conversation state (the realtime UPDATE also arrives, but this keeps
   *  the banner instant). */
  onChange?: (patch: {
    ai_autoreply_disabled: boolean;
    assigned_agent_id?: string | null;
  }) => void;
  /**
   * Account-wide "100% human agent mode". Passed in by the thread (which
   * already loads WhatsApp status) instead of re-fetching it here.
   */
  isGlobalBotPaused?: boolean;
}

/**
 * Inbox banner that surfaces + controls the AI auto-reply bot per
 * conversation:
 *   - bot active here → "AI is replying automatically" + [Take over]
 *   - bot paused here → the handoff note (if any) + [Resume AI]
 *   - account-wide human mode → a notice linking to Bot Reply settings
 */
export function AiThreadBanner({
  conversationId,
  disabled,
  handoffSummary,
  currentUserId,
  onChange,
  isGlobalBotPaused = false,
}: AiThreadBannerProps) {
  const [busy, setBusy] = useState(false);
  // The parent patches its conversation store from `onChange`, so the
  // prop itself flips instantly — no local mirror to drift out of sync
  // with the header's bot toggle.
  const paused = disabled;

  const toggle = useCallback(
    async (nextPaused: boolean) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/ai/autoreply/${conversationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // "Take over" also assigns the thread to the acting agent.
          body: JSON.stringify({ paused: nextPaused, assign_to_me: nextPaused }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.error ?? (nextPaused ? "Failed to pause bot" : "Failed to resume bot"));
          return;
        }
        onChange?.({
          ai_autoreply_disabled: nextPaused,
          ...(nextPaused
            ? currentUserId
              ? { assigned_agent_id: currentUserId }
              : {}
            : { assigned_agent_id: null }),
        });
        toast.success(
          nextPaused
            ? "Bot & automations paused for this conversation (Human Agent Mode)"
            : "Bot & flow automations resumed"
        );
      } catch {
        toast.error("Network error while updating bot status");
      } finally {
        setBusy(false);
      }
    },
    [conversationId, currentUserId, onChange],
  );

  // If Bot replies are globally disabled across all numbers (100% Human Agent Mode)
  if (isGlobalBotPaused) {
    return (
      <Banner tone="muted">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-500 shrink-0" />
          <BotOff className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-xs truncate">
              <span className="hidden sm:inline">Global Bot Reply Disabled (100% Human Agent Mode)</span>
              <span className="sm:hidden">Global Bot: Disabled</span>
            </p>
            <p className="truncate text-muted-foreground text-[11px]">
              Automations & AI replies are stopped. Inquiries wait for human agents.
            </p>
          </div>
        </div>
        <Link
          href="/bot-reply"
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <span>Manage Bot</span>
        </Link>
      </Banner>
    );
  }

  // Paused here (a human took over, or bot was disabled for this chat).
  if (paused) {
    return (
      <Banner tone="muted">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="font-medium text-foreground text-xs truncate">
              <span className="hidden sm:inline">Bot & Automations Paused (Human Agent Mode)</span>
              <span className="sm:hidden">Bot Paused (Human Mode)</span>
            </p>
            {handoffSummary && (
              <p className="truncate text-muted-foreground text-[11px]" title={handoffSummary}>
                {handoffSummary}
              </p>
            )}
          </div>
        </div>
        <BannerButton onClick={() => toggle(false)} busy={busy} icon={Undo2}>
          <span className="hidden sm:inline">Resume Bot / Automation</span>
          <span className="sm:hidden">Resume</span>
        </BannerButton>
      </Banner>
    );
  }

  // Active on this thread
  return (
    <Banner tone="primary">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="truncate font-medium text-foreground text-xs">
          <span className="hidden sm:inline">Bot & Flow Automation Active</span>
          <span className="sm:hidden">Bot Active</span>
        </span>
      </div>
      <BannerButton onClick={() => toggle(true)} busy={busy} icon={Hand}>
        <span className="hidden sm:inline">Pause Bot / Take Over</span>
        <span className="sm:hidden">Take Over</span>
      </BannerButton>
    </Banner>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "primary" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 shrink-0",
        tone === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-muted/40",
      )}
    >
      {children}
    </div>
  );
}

function BannerButton({
  onClick,
  busy,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  icon: typeof Hand;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {children}
    </button>
  );
}
