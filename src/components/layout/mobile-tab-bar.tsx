"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Menu, MessageSquare, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { isNavItemActive } from "@/components/layout/sidebar";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/flows", label: "Flows", icon: Workflow },
] as const;

/**
 * Native-app style bottom navigation for phones (and the installed PWA).
 * The four most-used destinations are one tap away; "More" opens the
 * full sidebar drawer. Hidden on lg+ where the sidebar is always shown,
 * and inside an open conversation where the composer needs the space.
 */
export function MobileTabBar({ onOpenMore, hidden }: { onOpenMore: () => void; hidden?: boolean }) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const unread = useTotalUnread();

  if (hidden) return null;

  return (
    <nav
      aria-label="Primary mobile"
      className="glass-header fixed inset-x-0 bottom-0 z-30 border-t border-border pb-safe lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname, tab);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/12")}>
                  <Icon className="size-[19px]" />
                </span>
                {label}
                {href === "/inbox" && unread > 0 && (
                  <span className="absolute left-1/2 top-1.5 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground active:text-foreground"
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="size-[19px]" />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
