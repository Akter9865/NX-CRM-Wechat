"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isRealtimeHealthy } from "@/hooks/use-realtime";
import {
  useConversationList,
  type InboxFilter,
} from "@/lib/inbox/use-conversation-list";
import type { InboxConversation } from "@/lib/inbox/session-window";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageThread } from "@/components/inbox/message-thread";
import { ContactSidebar } from "@/components/inbox/contact-sidebar";
import { cn } from "@/lib/utils";
import { playIncomingChime } from "@/lib/inbox/chime";

// Device-scoped UI preferences.
const CONTACT_PANEL_STORAGE_KEY = "wacrm:inbox:contact-panel-open";
const SOUND_STORAGE_KEY = "wacrm:inbox:sound-enabled";

function readBool(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : v === "true";
  } catch {
    return null;
  }
}

const prefListeners = new Set<() => void>();

function subscribePrefs(listener: () => void) {
  prefListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    prefListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * A boolean preference in localStorage. The server snapshot is the default,
 * so hydration matches and the stored value applies right after — without
 * a setState-in-effect pass. Also follows changes made in other tabs.
 */
function useStoredBool(key: string, fallback: boolean): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribePrefs,
    () => readBool(key) ?? fallback,
    () => fallback,
  );
  const toggle = useCallback(() => {
    const next = !(readBool(key) ?? fallback);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // Best-effort persistence.
    }
    for (const l of prefListeners) l();
  }, [key, fallback]);
  return [value, toggle];
}

// `useSearchParams` (the `?c=<id>` deep link) needs a Suspense boundary.
export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageInner />
    </Suspense>
  );
}

function InboxPageInner() {
  const t = useTranslations("Inbox.page");
  const searchParams = useSearchParams();
  const { user, accountId } = useAuth();
  const userId = user?.id ?? null;

  // The open conversation is plain state, seeded from `?c=<id>` once. The
  // URL is then kept in sync with history.replaceState — NOT router.replace,
  // which re-ran the force-dynamic dashboard layout on the server for every
  // click (a full RSC round-trip that made switching threads feel slow and
  // occasionally looked like the page reloading).
  const urlConvId = searchParams.get("c");
  const [activeId, setActiveId] = useState<string | null>(urlConvId);
  // Follow later in-app navigations to /inbox?c=<id> (e.g. a notification
  // link) while the page stays mounted. Adjusting state during render is
  // React's recommended alternative to a sync-from-props effect.
  const [seenUrlConvId, setSeenUrlConvId] = useState(urlConvId);
  if (urlConvId !== seenUrlConvId) {
    setSeenUrlConvId(urlConvId);
    if (urlConvId) setActiveId(urlConvId);
  }
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [soundEnabled, handleToggleSound] = useStoredBool(SOUND_STORAGE_KEY, true);
  const [contactPanelOpen, handleToggleContactPanel] = useStoredBool(
    CONTACT_PANEL_STORAGE_KEY,
    true,
  );
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);

  const soundRef = useRef(soundEnabled);
  useEffect(() => {
    soundRef.current = soundEnabled;
  });

  const lastChimeRef = useRef(0);
  const handleInbound = useCallback((_conv: InboxConversation, isActive: boolean) => {
    if (!soundRef.current) return;
    // Don't chime for the chat the agent is looking at right now.
    if (isActive && document.visibilityState === "visible") return;
    // A burst of messages (or a resync) plays one chime, not a cascade.
    const now = performance.now();
    if (now - lastChimeRef.current < 1500) return;
    lastChimeRef.current = now;
    playIncomingChime();
  }, []);

  const list = useConversationList({
    accountId,
    userId,
    filter,
    search,
    activeId,
    onInbound: handleInbound,
  });
  const { ensure, markRead, patch, resync: resyncList } = list;

  // Deep link / restored selection that isn't in the first page: fetch it.
  useEffect(() => {
    if (activeId && accountId) ensure(activeId);
  }, [activeId, accountId, ensure]);

  const activeConversation = activeId ? (list.byId.get(activeId) ?? null) : null;
  const activeContact = activeConversation?.contact ?? null;

  // Clear the unread badge as soon as a conversation is open (covers deep
  // links and the row arriving after selection).
  const activeUnread = activeConversation?.unread_count ?? 0;
  useEffect(() => {
    if (activeId && activeUnread > 0 && document.visibilityState === "visible") {
      markRead(activeId);
    }
  }, [activeId, activeUnread, markRead]);

  // WhatsApp connection banner.
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient()
          .from("whatsapp_config")
          .select("status")
          .eq("account_id", accountId)
          .eq("is_archived", false);
        if (cancelled) return;
        setWhatsappConnected(
          Boolean(data?.some((c: { status: string }) => c.status === "connected")),
        );
      } catch {
        // Banner is advisory; ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const syncUrl = useCallback((id: string | null) => {
    const url = id ? `/inbox?c=${encodeURIComponent(id)}` : "/inbox";
    // `null` per the Next docs: Next patches replaceState to keep its own
    // router state and to sync useSearchParams with the new URL.
    window.history.replaceState(null, "", url);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      syncUrl(id);
    },
    [syncUrl],
  );

  const handleBack = useCallback(() => {
    setActiveId(null);
    syncUrl(null);
  }, [syncUrl]);

  const hasActive = !!activeId;
  const live = isRealtimeHealthy(list.status);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {whatsappConnected === false && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-600 dark:text-amber-400">{t("whatsappNotConnected")}</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* List: the only pane on mobile until a chat is opened. */}
        <div
          className={cn(
            "h-full min-w-0 flex-1 lg:flex lg:flex-none",
            hasActive ? "hidden" : "flex",
          )}
        >
          <ConversationList
            conversations={list.conversations}
            activeConversationId={activeId}
            onSelect={handleSelect}
            filter={filter}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            currentUserId={userId}
            loading={list.loading}
            loadingMore={list.loadingMore}
            hasMore={list.hasMore}
            searching={list.searching}
            visibleSince={list.visibleSince}
            onLoadMore={list.loadMore}
            isLiveConnected={live}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        </div>

        {/* Thread: full width on mobile when open (back button returns to
            the list); always present on lg+. `min-w-0` keeps wide content
            from pushing the contact panel off-screen (issue #165). */}
        <div
          className={cn(
            "h-full min-w-0 flex-1 lg:flex",
            hasActive ? "flex" : "hidden",
          )}
        >
          <MessageThread
            conversation={activeConversation}
            contact={activeContact}
            onPatchConversation={patch}
            onBack={handleBack}
            onRefresh={resyncList}
            contactPanelOpen={contactPanelOpen}
            onToggleContactPanel={handleToggleContactPanel}
            isLiveConnected={live}
          />
        </div>

        {contactPanelOpen && hasActive && (
          <div className="hidden h-full xl:block">
            <ContactSidebar contact={activeContact} />
          </div>
        )}
      </div>
    </div>
  );
}
