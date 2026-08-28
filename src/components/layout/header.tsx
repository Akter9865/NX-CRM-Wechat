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
  const { isConnected, hasError, isLoading: waLoading, connectionCount, primaryConnection } = useWhatsAppStatus();
  const titleKey = getPageTitleKey(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/80 backdrop-blur-md px-4 lg:px-6">
      {/* Left side: Mobile menu & Breadcrumb hierarchy */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            NX CRM
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground/40 font-mono">/</span>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 text-xs font-bold text-foreground tracking-tight shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="capitalize">{t(titleKey as string)}</span>
          </div>
        </div>
      </div>

      {/* Center: Global Quick Search Shortcut */}
      <Link
        href="/contacts"
        className="hidden md:flex items-center gap-2.5 h-9 w-64 lg:w-80 rounded-xl border border-border/70 bg-card/60 px-3 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-card hover:text-foreground shadow-2xs group"
      >
        <Search className="size-3.5 text-muted-foreground/80 group-hover:text-primary transition-colors shrink-0" />
        <span className="truncate">Search contacts, deals, flows...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-4.5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Link>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* WhatsApp Cloud API Live Status Badge */}
        {waLoading ? (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 text-muted-foreground text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
            <span>Checking Meta API...</span>
          </div>
        ) : isConnected ? (
          <Link
            href="/settings?tab=whatsapp"
            title={
              primaryConnection?.display_phone_number
                ? `Meta API Connected: ${primaryConnection.display_phone_number}${connectionCount > 1 ? ` (+${connectionCount - 1} more)` : ""}`
                : "Meta API Connected — Click to manage"
            }
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all text-[11px] font-semibold animate-fade-in shadow-2xs"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <Zap className="size-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
            <span>Meta API Connected</span>
            {connectionCount > 1 && (
              <span className="rounded-full bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold">
                {connectionCount}
              </span>
            )}
          </Link>
        ) : hasError ? (
          <Link
            href="/settings?tab=whatsapp"
            title="Meta API Connection Error — Click to fix"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all text-[11px] font-semibold animate-fade-in shadow-2xs"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            <AlertTriangle className="size-3 text-red-600 dark:text-red-400" />
            <span>Meta API Error</span>
          </Link>
        ) : (
          <Link
            href="/settings?tab=whatsapp"
            title="Meta API Not Connected — Click to connect WhatsApp Business"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all text-[11px] font-semibold animate-fade-in shadow-2xs"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            <AlertCircle className="size-3 text-amber-600 dark:text-amber-400" />
            <span>Meta API Not Connected</span>
          </Link>
        )}

        {/* Notifications Icon with Unread Counter */}
        <Link
          href="/notifications"
          aria-label={t("notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground border border-border/60 hover:border-primary/40"
        >
          <Bell className="size-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-pulse shadow-sm">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        {/* PWA 1-Click Install Button */}
        <div className="hidden sm:block">
          <PwaInstallButton
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-border/60 hover:border-primary/40 bg-card/60 hover:bg-card text-xs font-semibold"
          />
        </div>

        {/* Theme Palette Switcher */}
        <ThemePalettePopover />

        {/* Mode Toggle (Light / Dark) */}
        <ModeToggle />

        {/* User Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full border border-border/80 bg-card/60 p-1 shadow-sm transition-all hover:bg-muted/70 hover:border-primary/40 focus:outline-none data-popup-open:bg-muted/70 sm:pl-1 sm:pr-3"
            aria-label={t("openAccountMenu")}
          >
            <Avatar className="size-7.5 ring-1 ring-border">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? t("defaultAvatar")}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 text-xs font-bold text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-xs font-semibold text-foreground sm:inline truncate max-w-28">
              {profile?.full_name ?? t("defaultUser")}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-56 bg-popover text-popover-foreground ring-border rounded-2xl p-1.5 shadow-2xl border-border"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {profile?.full_name ?? t("defaultUser")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email ?? ""}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
                  className="text-popover-foreground focus:bg-accent focus:text-accent-foreground rounded-xl"
                />
              }
            >
              <User className="size-4 mr-2 text-muted-foreground" />
              {t("menuProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=whatsapp"
                  className="text-popover-foreground focus:bg-accent focus:text-accent-foreground rounded-xl"
                />
              }
            >
              <SettingsIcon className="size-4 mr-2 text-muted-foreground" />
              {t("menuSettings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem
              onClick={signOut}
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-xl cursor-pointer"
            >
              <LogOut className="size-4 mr-2" />
              {t("menuSignOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
