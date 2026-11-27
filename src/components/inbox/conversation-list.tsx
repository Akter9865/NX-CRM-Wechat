"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { matchesContactFilters } from "@/lib/inbox/conversations";
import {
  matchesInboxFilter,
  type InboxFilter,
} from "@/lib/inbox/use-conversation-list";
import type { InboxConversation } from "@/lib/inbox/session-window";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";
import {
  Search,
  X,
  Send,
  Smartphone,
  Volume2,
  VolumeX,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChannelFilter = "all" | "whatsapp_cloud" | "whatsapp_web" | "telegram";

interface WhatsAppConnectionOption {
  id: string;
  connection_name?: string;
  business_name?: string;
  display_phone_number?: string;
  phone_number_id?: string;
}

interface ConversationListProps {
  /** Every known conversation, newest first (from useConversationList). */
  conversations: InboxConversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  /** Debounced search text reported to the parent for server-side search. */
  onSearchChange: (search: string) => void;
  currentUserId: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  searching: boolean;
  /** Hide rows older than this (outside the paged-in window). */
  visibleSince: number | null;
  onLoadMore: () => void;
  isLiveConnected?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const SEARCH_DEBOUNCE_MS = 250;

function ts(value: string | null | undefined): number {
  const n = value ? Date.parse(value) : NaN;
  return Number.isNaN(n) ? 0 : n;
}

/** WhatsApp-style list timestamp: 14:05 · Yesterday · Mon · 03/02/26. */
function formatListTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return format(d, "EEE");
  return format(d, "dd/MM/yy");
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  filter,
  onFilterChange,
  onSearchChange,
  currentUserId,
  loading,
  loadingMore,
  hasMore,
  searching,
  visibleSince,
  onLoadMore,
  isLiveConnected = true,
  soundEnabled = true,
  onToggleSound,
}: ConversationListProps) {
  const t = useTranslations("Inbox.conversationList");

  const FILTER_TABS = useMemo<{ label: string; value: InboxFilter }[]>(
    () => [
      { label: t("filterAll"), value: "all" },
      { label: t("filterUnread"), value: "unread" },
      { label: "Mine", value: "mine" },
      { label: "Unassigned", value: "unassigned" },
      { label: t("filterOpen"), value: "open" },
      { label: t("filterPending"), value: "pending" },
      { label: t("filterClosed"), value: "closed" },
    ],
    [t],
  );

  // Search: the input is local state (instant client-side filtering of the
  // loaded rows); the parent gets a debounced copy for the server search.
  const [search, setSearch] = useState("");
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  });
  useEffect(() => {
    const id = setTimeout(
      () => onSearchChangeRef.current(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [search]);

  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("all");
  // Contact-based filters (issue #272). Tags use OR logic, company is exact.
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [whatsappConnections, setWhatsappConnections] = useState<
    WhatsAppConnectionOption[]
  >([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/whatsapp/connections");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.connections)) {
          setWhatsappConnections(data.connections);
        }
      } catch {
        // Optional filter; ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tag definitions for the filter picker — loaded once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient().from("tags").select("*").order("name");
        if (!cancelled && data) setTags(data as Tag[]);
      } catch {
        // Optional filter; ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) {
      const co = c.contact?.company?.trim();
      if (co) set.add(co);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const channelTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) set.add(c.channel_type || "whatsapp_cloud");
    return set;
  }, [conversations]);

  const tagsById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const tag of tags) m.set(tag.id, tag);
    return m;
  }, [tags]);

  const query = search.trim().toLowerCase();
  const searchActive = query.length >= 2;

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (
        !matchesInboxFilter(c, filter, currentUserId) &&
        // Opening a chat from "Unread" clears its badge; keep it in place
        // while it's open instead of yanking the row out from under the click.
        !(filter === "unread" && c.id === activeConversationId)
      ) {
        return false;
      }
      // Rows outside the paged-in window wait for "load more" — except
      // while searching, where server results may be arbitrarily old.
      if (
        !searchActive &&
        visibleSince !== null &&
        c.id !== activeConversationId &&
        ts(c.last_message_at) < visibleSince
      ) {
        return false;
      }
      if (selectedChannel !== "all") {
        const ch = c.channel_type || "whatsapp_cloud";
        if (ch !== selectedChannel) return false;
      }
      if (
        selectedConnectionId !== null &&
        c.whatsapp_connection_id !== selectedConnectionId
      ) {
        return false;
      }
      if (
        (selectedTagIds.length > 0 || selectedCompany !== null) &&
        !matchesContactFilters(c, { tagIds: selectedTagIds, company: selectedCompany })
      ) {
        return false;
      }
      if (query) {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        const digits = query.replace(/\D/g, "");
        if (
          !name.includes(query) &&
          !phone.includes(query) &&
          !(digits.length >= 3 && phone.replace(/\D/g, "").includes(digits)) &&
          !lastMsg.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    conversations,
    filter,
    currentUserId,
    searchActive,
    visibleSince,
    activeConversationId,
    selectedChannel,
    selectedConnectionId,
    selectedTagIds,
    selectedCompany,
    query,
  ]);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearExtraFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedCompany(null);
    setSelectedConnectionId(null);
    setSelectedChannel("all");
  }, []);

  const extraFilterCount =
    selectedTagIds.length +
    (selectedCompany ? 1 : 0) +
    (selectedConnectionId ? 1 : 0) +
    (selectedChannel !== "all" ? 1 : 0);

  const hasExtraFilterOptions =
    tags.length > 0 ||
    companies.length > 0 ||
    whatsappConnections.length > 1 ||
    channelTypes.size > 1;

  // Infinite scroll: load the next page when the sentinel nears the viewport.
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });
  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || !hasMore || searchActive) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMoreRef.current();
      },
      { root, rootMargin: "0px 0px 400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, searchActive, filtered.length]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-r border-border bg-card lg:w-[22rem]">
      {/* Title row */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Chats</h2>
          <span
            title={isLiveConnected ? "Live updates connected" : "Reconnecting…"}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              isLiveConnected
                ? "text-muted-foreground"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isLiveConnected ? "bg-primary" : "animate-pulse bg-amber-500",
              )}
            />
            {isLiveConnected ? "Live" : "Reconnecting"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {hasExtraFilterOptions && (
            <ExtraFiltersMenu
              t={t}
              count={extraFilterCount}
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggleTag={toggleTag}
              companies={companies}
              selectedCompany={selectedCompany}
              onCompanyChange={setSelectedCompany}
              connections={whatsappConnections}
              selectedConnectionId={selectedConnectionId}
              onConnectionChange={setSelectedConnectionId}
              channelTypes={channelTypes}
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
            />
          )}
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              title={soundEnabled ? "Mute new-message sound" : "Unmute new-message sound"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted",
                soundEnabled ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {soundEnabled ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeX className="size-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            // 16px on phones to stop iOS zoom-on-focus.
            className="h-9 w-full rounded-full border border-transparent bg-muted pl-9 pr-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 sm:text-sm"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Conversation filter"
        className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FILTER_TABS.map((tab) => {
          const selected = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onFilterChange(tab.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "bg-primary-soft-2 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {extraFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
          {selectedTagIds.map((id) => {
            const tag = tagsById.get(id);
            return (
              <FilterChip key={id} onRemove={() => toggleTag(id)}>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tag?.color ?? "var(--muted-foreground)" }}
                />
                {tag?.name ?? t("tags")}
              </FilterChip>
            );
          })}
          {selectedCompany && (
            <FilterChip onRemove={() => setSelectedCompany(null)}>{selectedCompany}</FilterChip>
          )}
          {selectedConnectionId && (
            <FilterChip onRemove={() => setSelectedConnectionId(null)}>
              {whatsappConnections.find((c) => c.id === selectedConnectionId)
                ?.connection_name || "WhatsApp"}
            </FilterChip>
          )}
          {selectedChannel !== "all" && (
            <FilterChip onRemove={() => setSelectedChannel("all")}>
              {CHANNEL_LABELS[selectedChannel]}
            </FilterChip>
          )}
          <button
            type="button"
            onClick={clearExtraFilters}
            className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {t("clearAll")}
          </button>
        </div>
      )}

      {/* Rows */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading && filtered.length === 0 ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {searching ? "Searching…" : t("noConversations")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col py-1">
            {filtered.map((conv) => (
              <ConversationRow
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                isMine={!!currentUserId && conv.assigned_agent_id === currentUserId}
                onSelect={onSelect}
                unknownLabel={t("unknown")}
                emptyLabel={t("noMessagesYet")}
              />
            ))}
          </ul>
        )}
        {hasMore && !searchActive && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                type="button"
                onClick={onLoadMore}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CHANNEL_LABELS: Record<ChannelFilter, string> = {
  all: "All channels",
  whatsapp_cloud: "WhatsApp API",
  whatsapp_web: "WhatsApp Web",
  telegram: "Telegram",
};

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex max-w-40 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground hover:bg-muted/70"
    >
      <span className="flex min-w-0 items-center gap-1 truncate">{children}</span>
      <X className="h-3 w-3 shrink-0" />
    </button>
  );
}

function ExtraFiltersMenu({
  t,
  count,
  tags,
  selectedTagIds,
  onToggleTag,
  companies,
  selectedCompany,
  onCompanyChange,
  connections,
  selectedConnectionId,
  onConnectionChange,
  channelTypes,
  selectedChannel,
  onChannelChange,
}: {
  t: ReturnType<typeof useTranslations>;
  count: number;
  tags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  companies: string[];
  selectedCompany: string | null;
  onCompanyChange: (c: string | null) => void;
  connections: WhatsAppConnectionOption[];
  selectedConnectionId: string | null;
  onConnectionChange: (id: string | null) => void;
  channelTypes: Set<string>;
  selectedChannel: ChannelFilter;
  onChannelChange: (c: ChannelFilter) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="More filters"
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted",
          count > 0 ? "text-primary" : "text-muted-foreground",
        )}
      >
        <SlidersHorizontal className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-60 border-border bg-popover">
        {channelTypes.size > 1 && (
          <>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">Channel</DropdownMenuLabel>
            {(Object.keys(CHANNEL_LABELS) as ChannelFilter[])
              .filter((c) => c === "all" || channelTypes.has(c))
              .map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => onChannelChange(c)}
                  className={cn("text-sm", selectedChannel === c && "text-primary")}
                >
                  {CHANNEL_LABELS[c]}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
          </>
        )}
        {connections.length > 1 && (
          <>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">WhatsApp number</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onConnectionChange(null)}
              className={cn("text-sm", selectedConnectionId === null && "text-primary")}
            >
              All numbers ({connections.length})
            </DropdownMenuItem>
            {connections.map((conn) => (
              <DropdownMenuItem
                key={conn.id}
                onClick={() => onConnectionChange(conn.id)}
                className={cn(
                  "flex flex-col items-start gap-0.5 text-sm",
                  selectedConnectionId === conn.id && "text-primary",
                )}
              >
                <span className="truncate">{conn.connection_name || conn.business_name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {conn.display_phone_number || conn.phone_number_id}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        {tags.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">{t("tags")}</DropdownMenuLabel>
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={selectedTagIds.includes(tag.id)}
                onCheckedChange={() => onToggleTag(tag.id)}
                className="text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            {companies.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {companies.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">{t("company")}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onCompanyChange(null)}
              className={cn("text-sm", selectedCompany === null && "text-primary")}
            >
              {t("allCompanies")}
            </DropdownMenuItem>
            {companies.map((co) => (
              <DropdownMenuItem
                key={co}
                onClick={() => onCompanyChange(co)}
                className={cn("text-sm", selectedCompany === co && "text-primary")}
              >
                <span className="truncate">{co}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col py-1" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ConversationRowProps {
  conversation: InboxConversation;
  isActive: boolean;
  isMine: boolean;
  onSelect: (conversationId: string) => void;
  unknownLabel: string;
  emptyLabel: string;
}

/**
 * Memoised row: a realtime update to one conversation re-renders only that
 * row (the store keeps object identity for unchanged conversations).
 */
const ConversationRow = memo(function ConversationRow({
  conversation,
  isActive,
  isMine,
  onSelect,
  unknownLabel,
  emptyLabel,
}: ConversationRowProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || unknownLabel;
  const initials = displayName.trim().charAt(0).toUpperCase() || "?";
  const unread = conversation.unread_count ?? 0;
  const time = formatListTime(conversation.last_message_at);
  const channel = conversation.channel_type;

  return (
    <li className="[contain-intrinsic-size:auto_72px] [content-visibility:auto]">
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isActive ? "bg-primary-soft" : "hover:bg-muted/60",
        )}
      >
        {isActive && (
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" aria-hidden />
        )}
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary-soft-2 text-sm font-semibold text-primary">
            {contact?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.avatar_url}
                alt=""
                loading="lazy"
                className="h-11 w-11 object-cover"
              />
            ) : (
              initials
            )}
          </div>
          {channel === "telegram" ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-sky-500 text-white" title="Telegram">
              <Send className="h-2 w-2" />
            </span>
          ) : channel === "whatsapp_web" ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-emerald-600 text-white" title="WhatsApp Web">
              <Smartphone className="h-2 w-2" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm text-foreground",
                unread > 0 ? "font-semibold" : "font-medium",
              )}
            >
              {displayName}
            </span>
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                unread > 0 ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                unread > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {conversation.last_message_text || emptyLabel}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {conversation.status !== "open" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-medium capitalize",
                    conversation.status === "pending"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {conversation.status === "closed" ? "Resolved" : conversation.status}
                </span>
              )}
              {isMine && (
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                  You
                </span>
              )}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
});
