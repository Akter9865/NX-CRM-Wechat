"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { addContactTag, deleteContactTag } from "@/lib/contacts/tag-api";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  X,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ContactSidebarProps {
  contact: Contact | null;
  onTagsUpdated?: () => void;
}

const TAG_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function ContactSidebar({ contact, onTagsUpdated }: ContactSidebarProps) {
  const tSidebar = useTranslations("Inbox.sidebar");
  const tThread = useTranslations("Inbox.messageThread");

  const { accountId, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [allWorkspaceTags, setAllWorkspaceTags] = useState<Tag[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagActionLoading, setTagActionLoading] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    // Fetch deals, notes, tags, and all workspace tags in parallel
    let allTagsQuery = supabase.from("tags").select("*").order("name", { ascending: true });
    if (accountId) {
      allTagsQuery = allTagsQuery.eq("account_id", accountId);
    }

    const [dealsRes, notesRes, tagsRes, allTagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
      allTagsQuery,
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
    if (allTagsRes.data) {
      setAllWorkspaceTags(allTagsRes.data);
    }
  }, [contact, accountId]);

  // Load on contact change
  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const handleToggleTag = useCallback(
    async (tag: Tag) => {
      if (!contact) return;
      const isAssigned = tags.some((t) => t.id === tag.id);
      setTagActionLoading(true);

      try {
        if (isAssigned) {
          await deleteContactTag(contact.id, tag.id);
          setTags((prev) => prev.filter((t) => t.id !== tag.id));
          toast.success(`Removed tag "${tag.name}"`);
        } else {
          await addContactTag(contact.id, tag.id);
          setTags((prev) => [
            ...prev,
            { ...tag, contact_tag_id: `ct-${Date.now()}` },
          ]);
          toast.success(`Added tag "${tag.name}"`);
        }
        onTagsUpdated?.();
      } catch (err) {
        console.error("Tag toggle failed:", err);
        toast.error("Failed to update contact tag");
      } finally {
        setTagActionLoading(false);
      }
    },
    [contact, tags, onTagsUpdated],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string, tagName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!contact) return;
      try {
        await deleteContactTag(contact.id, tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        toast.success(`Removed tag "${tagName}"`);
        onTagsUpdated?.();
      } catch (err) {
        console.error("Failed to delete tag:", err);
        toast.error("Failed to remove tag");
      }
    },
    [contact, onTagsUpdated],
  );

  const handleCreateAndAssignTag = useCallback(async () => {
    const name = tagSearchQuery.trim();
    if (!name || !contact || !user || !accountId) return;

    setTagActionLoading(true);
    try {
      const supabase = createClient();
      const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];

      const { data: newTag, error: createErr } = await supabase
        .from("tags")
        .insert({
          name,
          color,
          user_id: user.id,
          account_id: accountId,
        })
        .select()
        .single();

      if (createErr || !newTag) {
        throw new Error(createErr?.message || "Failed to create tag");
      }

      setAllWorkspaceTags((prev) => [...prev, newTag]);

      // Assign to contact
      await addContactTag(contact.id, newTag.id);
      setTags((prev) => [
        ...prev,
        { ...newTag, contact_tag_id: `ct-${Date.now()}` },
      ]);

      setTagSearchQuery("");
      toast.success(`Created & assigned tag "${name}"`);
      onTagsUpdated?.();
    } catch (err) {
      console.error("Error creating tag:", err);
      toast.error("Failed to create tag");
    } finally {
      setTagActionLoading(false);
    }
  }, [tagSearchQuery, contact, user, accountId, onTagsUpdated]);

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return allWorkspaceTags;
    const q = tagSearchQuery.toLowerCase();
    return allWorkspaceTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allWorkspaceTags, tagSearchQuery]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        account_id: accountId,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-72 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">{tThread("selectConversation")}</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-card">
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Contact Info */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
              {contact.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {displayName}
            </h3>
            {contact.company && (
              <p className="text-xs text-muted-foreground">{contact.company}</p>
            )}
          </div>

          {/* Phone */}
          <div className="mt-4 space-y-2">
            <button
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{contact.phone}</span>
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Tags Section with Interactive Add / Remove */}
          <div>
            <div className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TagIcon className="h-3 w-3" />
                <span>{tSidebar("tags")}</span>
              </div>

              {/* Add Tag Popover Trigger */}
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger className="inline-flex items-center h-6 px-1.5 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-md transition-colors cursor-pointer">
                  <Plus className="h-3 w-3" />
                  <span>Add Tag</span>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-64 p-2 bg-popover border-border rounded-2xl shadow-xl space-y-2 z-50"
                >
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search or create tag..."
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      className="h-8 pl-8 pr-2 text-xs bg-muted border-border rounded-xl"
                    />
                  </div>

                  {/* Tag List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 py-1">
                    {filteredTags.length === 0 && tagSearchQuery.trim() === "" ? (
                      <p className="text-[11px] text-muted-foreground text-center py-3">
                        No tags found in workspace.
                      </p>
                    ) : (
                      filteredTags.map((t) => {
                        const isAssigned = tags.some((assigned) => assigned.id === t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleToggleTag(t)}
                            disabled={tagActionLoading}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: t.color }}
                              />
                              <span className="truncate text-foreground font-medium">
                                {t.name}
                              </span>
                            </div>
                            {isAssigned && (
                              <Check className="size-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}

                    {/* Create inline tag option */}
                    {tagSearchQuery.trim() !== "" &&
                      !allWorkspaceTags.some(
                        (t) => t.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={handleCreateAndAssignTag}
                          disabled={tagActionLoading}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors font-semibold cursor-pointer border-t border-border mt-1"
                        >
                          <Plus className="size-3.5" />
                          <span className="truncate">
                            Create &quot;{tagSearchQuery.trim()}&quot;
                          </span>
                        </button>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned Tags List */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noTags")}</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.contact_tag_id || tag.id}
                    className="group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      borderColor: `${tag.color}40`,
                    }}
                  >
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTag(tag.id, tag.name, e)}
                      title={`Remove tag ${tag.name}`}
                      className="size-3.5 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/20 transition-all cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Active Deals */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {tSidebar("deals")}
            </div>
            <div className="mt-2 space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noDeals")}</p>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deal.currency ?? "$"}
                        {deal.value.toLocaleString()}
                      </span>
                      {deal.stage && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${deal.stage.color}20`,
                            color: deal.stage.color,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" />
              {tSidebar("notes")}
            </div>
            <div className="mt-2">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={tSidebar("addNotePlaceholder")}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <Button
                  size="sm"
                  className="h-auto bg-primary px-2 hover:bg-primary/90"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
