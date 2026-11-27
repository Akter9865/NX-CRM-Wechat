"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  User,
  Zap,
} from "lucide-react";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { ThemePalettePopover } from "@/components/layout/theme-palette-popover";
import { PwaInstallButton } from "@/components/pwa/pwa-install";
import { useTranslations } from "next-intl";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inbox": "inbox",
  "/notifications": "notifications",
  "/contacts": "contacts",
  "/pipelines": "pipelines",
  "/broadcasts": "broadcasts",
  "/automations": "automations",
  "/flows": "flows",
  "/bot-reply": "botReply",
  "/agents": "aiAgents",
  "/tools": "tools",
  "/billing": "billing",
  "/settings": "settings",
};

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "dashboard";
}

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  const {
    isConnected,
    hasError,
    isLoading: waLoading,
    connectionCount,
    primaryConnection,
    isBanned,
    isRestricted,
    bannedCount,
  } = useWhatsAppStatus();
  const titleKey = getPageTitleKey(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  const status = waLoading
    ? { tone: "muted", label: "Checking…", short: "…", icon: null as null | typeof Zap, title: "Checking WhatsApp connection" }
    : isBanned
      ? { tone: "rose", label: "Number banned", short: "Banned", icon: AlertCircle, title: "Meta has banned a connected number — click to review" }
      : isRestricted
        ? { tone: "amber", label: "Restricted", short: "Restricted", icon: AlertTriangle, title: "Messaging restricted by Meta — click to review" }
        : isConnected
          ? {
              tone: "emerald",
              label: primaryConnection?.display_phone_number ?? "WhatsApp live",
              short: "Live",
              icon: Zap,
              title: `WhatsApp connected${connectionCount > 1 ? ` (${connectionCount} numbers)` : ""} — click to manage`,
            }
          : hasError
            ? { tone: "rose", label: "Connection error", short: "Error", icon: AlertTriangle, title: "WhatsApp connection error — click to fix" }
            : { tone: "amber", label: "Connect WhatsApp", short: "Connect", icon: AlertCircle, title: "Connect your WhatsApp Business number" };

  const toneClass: Record<string, string> = {
    muted: "border-border bg-muted text-muted-foreground",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  const dotClass: Record<string, string> = {
    muted: "bg-muted-foreground/50",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  const StatusIcon = status.icon;

  return (
    <header className="glass-header sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 pt-safe sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label={t("openMenu")}
        className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {t(titleKey as string)}
      </h1>

      <Link
        href="/contacts"
        className="ml-auto hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] text-muted-foreground shadow-elev-1 transition-colors hover:border-primary/40 hover:text-foreground md:flex lg:w-72"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search contacts…</span>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-0">
        <Link
          href="/settings?tab=whatsapp"
          title={status.title}
          className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors hover:brightness-95 ${toneClass[status.tone]}`}
        >
          <span className={`size-1.5 shrink-0 rounded-full ${dotClass[status.tone]}`} />
          {StatusIcon ? <StatusIcon className="hidden size-3.5 shrink-0 sm:block" /> : null}
          <span className="hidden max-w-36 truncate lg:inline">{status.label}</span>
          <span className="lg:hidden">{status.short}</span>
          {bannedCount > 1 && <span className="rounded-full bg-rose-500/20 px-1 text-[10px]">{bannedCount}</span>}
        </Link>

        <Link
          href="/notifications"
          aria-label={t("notifications")}
          className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <div className="hidden xl:block">
          <PwaInstallButton variant="ghost" size="sm" className="h-9 rounded-lg text-xs font-semibold" />
        </div>

        <div className="hidden sm:block">
          <ThemePalettePopover />
        </div>
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex shrink-0 items-center rounded-full p-0.5 transition-colors hover:bg-muted focus:outline-none data-popup-open:bg-muted"
            aria-label={t("openAccountMenu")}
          >
            <Avatar className="size-8 ring-1 ring-border">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? t("defaultAvatar")} />
              ) : null}
              <AvatarFallback className="bg-primary/12 text-xs font-bold text-primary">{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-60 rounded-xl p-1.5">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name ?? t("defaultUser")}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings?tab=profile" className="rounded-lg" />}>
              <User className="mr-2 size-4 text-muted-foreground" />
              {t("menuProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings?tab=whatsapp" className="rounded-lg" />}>
              <SettingsIcon className="mr-2 size-4 text-muted-foreground" />
              {t("menuSettings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer rounded-lg text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400">
              <LogOut className="mr-2 size-4" />
              {t("menuSignOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
