"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { memo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Blocks,
  Bot,
  BotMessageSquare,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  MessageSquare,
  MousePointerClick,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { AccountRole } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/layout/brand-mark";

const ROLE_CHIP: Record<AccountRole, { icon: typeof Crown; labelKey: string; className: string }> = {
  owner: { icon: Crown, labelKey: "roleOwner", className: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  admin: { icon: Shield, labelKey: "roleAdmin", className: "bg-primary/12 text-primary" },
  agent: { icon: UserCog, labelKey: "roleAgent", className: "bg-muted text-foreground" },
  viewer: { icon: User, labelKey: "roleViewer", className: "bg-muted text-muted-foreground" },
};

interface NavItem {
  href: string;
  labelKey: string;
  labelFallback?: string;
  icon: typeof LayoutDashboard;
  badgeText?: string;
  subItems?: { href: string; labelKey: string; labelFallback: string; icon: typeof LinkIcon }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Navigation grouped the way WhatsApp-business tools organise work:
 *  talk to customers → automate → grow → account. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Engage",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/inbox", labelKey: "inbox", labelFallback: "Team Inbox", icon: MessageSquare },
      { href: "/contacts", labelKey: "contacts", icon: Users },
      { href: "/broadcasts", labelKey: "broadcasts", labelFallback: "Campaigns", icon: Radio, badgeText: "Soon" },
      { href: "/notifications", labelKey: "notifications", icon: Bell },
    ],
  },
  {
    label: "Automate",
    items: [
      { href: "/flows", labelKey: "flows", labelFallback: "Chatbot Flows", icon: Workflow },
      { href: "/bot-reply", labelKey: "botReply", labelFallback: "Bot Reply", icon: BotMessageSquare },
      { href: "/agents", labelKey: "aiAgents", icon: Bot },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/pipelines", labelKey: "pipelines", labelFallback: "Sales Pipeline", icon: GitBranch },
      { href: "/settings?tab=integrations", labelKey: "integrations", labelFallback: "Integrations", icon: Blocks },
      {
        href: "/tools",
        labelKey: "tools",
        labelFallback: "Growth Tools",
        icon: Wrench,
        subItems: [
          { href: "/tools/whatsapp-link", labelKey: "whatsappLink", labelFallback: "WhatsApp Link", icon: LinkIcon },
          { href: "/tools/whatsapp-button", labelKey: "whatsappButton", labelFallback: "Website Chat Button", icon: MousePointerClick },
        ],
      },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing", labelKey: "billing", labelFallback: "Billing & Plans", icon: CreditCard },
      { href: "/settings", labelKey: "settings", icon: Settings },
    ],
  },
];

export function isNavItemActive(href: string, pathname: string, tab: string | null): boolean {
  if (href.includes("tab=integrations")) return pathname === "/settings" && tab === "integrations";
  if (href === "/settings") return pathname.startsWith("/settings") && tab !== "integrations";
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/flows") return pathname.startsWith("/flows") || pathname.startsWith("/automations");
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  /** Mobile drawer state — controlled by the header's menu button. */
  open?: boolean;
  onClose?: () => void;
  /** Desktop: icon-only rail. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const NavLink = memo(function NavLink({
  item,
  active,
  collapsed,
  label,
  trailing,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  label: string;
  trailing?: React.ReactNode;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13.5px] font-medium transition-colors duration-150 lg:py-2",
        collapsed && "lg:justify-center lg:px-0",
        active
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{label}</span>
      {item.badgeText && (
        <span className={cn("rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400", collapsed && "lg:hidden")}>
          {item.badgeText}
        </span>
      )}
      {trailing}
    </Link>
  );
});

export function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const showAccountStrip = !profileLoading && !!account?.name;

  // Close the mobile drawer after navigating.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ?? profile?.email?.charAt(0)?.toUpperCase() ?? "U";
  const label = (item: { labelKey: string; labelFallback?: string }) =>
    item.labelFallback || t(item.labelKey);

  return (
    <>
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[272px] flex-col border-r border-sidebar-border bg-sidebar pt-safe",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0 shadow-elev-3" : "-translate-x-full",
          "lg:static lg:z-0 lg:translate-x-0 lg:shadow-none lg:transition-[width] lg:duration-200",
          collapsed ? "lg:w-[68px]" : "lg:w-60",
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 shrink-0 items-center justify-between gap-2 px-4 sm:h-16", collapsed && "lg:justify-center lg:px-0")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="size-9" />
            <div className={cn("min-w-0 leading-tight", collapsed && "lg:hidden")}>
              <p className="truncate text-[15px] font-bold tracking-tight text-foreground">NX CRM</p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">WhatsApp Business Suite</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Workspace */}
        {showAccountStrip && account?.name && (
          <div className={cn("mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-card-2/60 px-2.5 py-2", collapsed && "lg:hidden")}>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-bold text-primary">
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground" title={account.name}>{account.name}</p>
              <p className="text-[10px] text-muted-foreground">Workspace</p>
            </div>
            {accountRole &&
              (() => {
                const meta = ROLE_CHIP[accountRole];
                const Icon = meta.icon;
                return (
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", meta.className)}>
                    <Icon className="size-3" />
                    {t(meta.labelKey)}
                  </span>
                );
              })()}
          </div>
        )}

        {/* Navigation */}
        <nav className="scrollbar-none flex-1 overflow-y-auto px-3 pb-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="pt-3 first:pt-1">
              <p className={cn("px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70", collapsed && "lg:sr-only")}>
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(item.href, pathname, currentTab);
                  let trailing: React.ReactNode = null;
                  if (item.href === "/inbox" && totalUnread > 0) {
                    trailing = (
                      <span
                        aria-label={t("unreadConversations", { count: totalUnread })}
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground",
                          collapsed && "lg:absolute lg:right-1 lg:top-0.5 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[9px]",
                        )}
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    );
                  } else if (item.href === "/notifications" && unreadNotifications > 0) {
                    trailing = (
                      <span
                        aria-label={t("unreadNotifications", { count: unreadNotifications })}
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white",
                          collapsed && "lg:absolute lg:right-1 lg:top-0.5 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[9px]",
                        )}
                      >
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <NavLink item={item} active={active} collapsed={collapsed} label={label(item)} trailing={trailing} />
                      {item.subItems && pathname.startsWith("/tools") && (
                        <ul className={cn("ml-[22px] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2.5", collapsed && "lg:hidden")}>
                          {item.subItems.map((sub) => {
                            const subActive = pathname === sub.href;
                            return (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                    subActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                                  )}
                                >
                                  <sub.icon className="size-3.5 shrink-0" />
                                  {label(sub)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: collapse + user */}
        <div className="shrink-0 border-t border-sidebar-border p-2.5 pb-safe">
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                "mb-1 hidden w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex",
                collapsed && "justify-center px-0",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent focus:outline-none data-popup-open:bg-sidebar-accent",
                collapsed && "lg:justify-center",
              )}
            >
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? t("defaultAvatar")} /> : null}
                <AvatarFallback className="bg-primary/12 text-xs font-bold text-primary">{initial}</AvatarFallback>
              </Avatar>
              <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                <p className="truncate text-[13px] font-semibold text-foreground">{profile?.full_name ?? t("defaultUser")}</p>
                <p className="truncate text-[11px] text-muted-foreground">{profile?.email ?? ""}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={6} className="min-w-56">
              <DropdownMenuItem render={<Link href="/settings?tab=profile" onClick={onClose} />}>
                <User className="size-4" />
                {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings?tab=whatsapp" onClick={onClose} />}>
                <Settings className="size-4" />
                {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-rose-600 focus:text-rose-600 dark:text-rose-400">
                <LogOut className="size-4" />
                {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
