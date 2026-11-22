"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { Header } from "@/components/layout/header";
import { AppFooter } from "@/components/layout/app-footer";
import { AccountAccessAlert } from "@/components/layout/account-access-alert";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { SubscriptionLockBanner } from "@/components/billing/subscription-lock-banner";
import { PlanUpgradeLockModal } from "@/components/billing/plan-upgrade-lock-modal";
import { createClient } from "@/lib/supabase/client";
import { getAccountEntitlement, type AccountEntitlementSummary } from "@/lib/billing/entitlements";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Zap, ArrowRight, Lock, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Auth-gated & subscription-aware dashboard shell.
function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, accountId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  // Desktop rail collapse, remembered per browser.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      setCollapsed(localStorage.getItem("nxcrm.sidebar.collapsed") === "1");
    } catch {}
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("nxcrm.sidebar.collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  }, []);

  const [entitlementSummary, setEntitlementSummary] = useState<AccountEntitlementSummary | null>(null);

  // Check subscription status & live entitlement quotas
  const refreshSubscription = useCallback(async () => {
    if (!accountId) return;
    try {
      const summary = await getAccountEntitlement(accountId, supabase);
      setEntitlementSummary(summary);
    } catch (err) {
      console.error('[DashboardShell] Error fetching entitlement:', err);
    }
  }, [accountId, supabase]);

  useEffect(() => {
    let isMounted = true;
    if (!accountId) return;

    void getAccountEntitlement(accountId, supabase).then(
      (summary) => {
        if (!isMounted) return;
        setEntitlementSummary(summary);
      },
      (err: unknown) => {
        if (isMounted) {
          console.error('[DashboardShell] Error fetching entitlement:', err);
        }
      },
    );

    // Re-check plan status when the user returns to the tab (e.g. after
    // paying in another tab) — cheap, and avoids a manual reload.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSubscription();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accountId, supabase, refreshSubscription]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] bg-background" aria-busy="true" aria-label="Loading">
        <div className="hidden w-60 shrink-0 border-r border-border bg-sidebar p-4 lg:block">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="size-9 animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="mb-2 h-8 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
        <div className="flex-1">
          <div className="h-14 border-b border-border sm:h-16" />
          <div className="space-y-4 p-4 sm:p-6">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/70" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Determine if current page is a restricted CRM operation when subscription or quota is locked
  const restrictedPrefixes = ['/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/flows', '/agents'];
  const isRestrictedRoute = restrictedPrefixes.some((p) => pathname.startsWith(p));
  
  const isSubscriptionLocked = Boolean(entitlementSummary?.isLocked);
  const isContactsOverLimit = Boolean(entitlementSummary?.contacts.isOverLimit);
  const isMessagesOverLimit = Boolean(entitlementSummary?.messages.isOverLimit);
  const isOverQuota = isContactsOverLimit || isMessagesOverLimit;
  const isLocked = (isSubscriptionLocked || isOverQuota) && isRestrictedRoute;

  // Workspace canvas routes (/inbox, /flows/[id]) require 100% viewport fit without outer scrollbars
  const isFullHeightRoute = pathname.startsWith('/inbox') || (pathname.startsWith('/flows/') && pathname !== '/flows');
  // The inbox and the flow canvas need every pixel on phones; hide the
  // bottom tab bar there (the inbox has its own back navigation).
  const hideTabBar = isFullHeightRoute;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <PresenceHeartbeat />
      <Suspense fallback={<aside className="hidden lg:block lg:w-60 border-r border-border bg-sidebar shrink-0" />}>
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <ImpersonationBanner />
        <Header onOpenSidebar={openSidebar} />
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0",
            isFullHeightRoute ? "overflow-hidden" : "overflow-y-auto justify-between"
          )}
        >
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0",
              isFullHeightRoute
                ? "h-full w-full overflow-hidden p-0"
                : "mx-auto w-full max-w-[1440px] space-y-6 p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6"
            )}
          >
            {!isFullHeightRoute && <AccountAccessAlert />}

            {entitlementSummary && (
              <>
                <SubscriptionLockBanner
                  statusInfo={entitlementSummary}
                  onRenewClick={() => {
                    void refreshSubscription();
                  }}
                />
                <PlanUpgradeLockModal
                  summary={entitlementSummary}
                  onRenewSuccess={() => {
                    void refreshSubscription();
                  }}
                />
              </>
            )}

            {isLocked ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-12">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-500 ring-8 ring-amber-500/10 mb-6">
                  <Lock className="size-8 animate-pulse" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl max-w-md">
                  {isContactsOverLimit
                    ? 'Contact Limit Reached'
                    : isMessagesOverLimit
                    ? 'Monthly Message Limit Reached'
                    : 'CRM Access Restricted'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-lg leading-relaxed">
                  {isContactsOverLimit
                    ? `Your account has reached the ${entitlementSummary?.plan.name} contact capacity limit (${entitlementSummary?.contacts.current.toLocaleString()} / ${entitlementSummary?.contacts.limit?.toLocaleString()} contacts). Upgrade your plan to unlock more contacts.`
                    : isMessagesOverLimit
                    ? `Your account has reached the monthly message limit (${entitlementSummary?.messages.currentMonthSent.toLocaleString()} / ${entitlementSummary?.messages.limit?.toLocaleString()} messages). Upgrade to send unlimited messages.`
                    : 'Your subscription has expired. All stored WhatsApp conversations, contacts, and automation workflows remain safely preserved.'}
                </p>

                {entitlementSummary && (
                  <div className="mt-5 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2">
                      <Users className="size-3.5 text-blue-400" />
                      <span className="text-muted-foreground">Contacts:</span>
                      <span className="font-bold text-foreground">
                        {entitlementSummary.contacts.current.toLocaleString()} / {entitlementSummary.contacts.limit !== null ? entitlementSummary.contacts.limit.toLocaleString() : '∞'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2">
                      <MessageSquare className="size-3.5 text-emerald-400" />
                      <span className="text-muted-foreground">Messages:</span>
                      <span className="font-bold text-foreground">
                        {entitlementSummary.messages.currentMonthSent.toLocaleString()} / {entitlementSummary.messages.limit !== null ? entitlementSummary.messages.limit.toLocaleString() : '∞'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/pricing">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs h-10 px-6 shadow-lg shadow-emerald-600/20">
                      <Zap className="size-4 mr-1.5" />
                      <span>Upgrade Plan (Instant Activation)</span>
                      <ArrowRight className="size-4 ml-1.5" />
                    </Button>
                  </Link>
                  <Link href="/billing">
                    <Button variant="outline" className="border-border rounded-xl text-xs h-10 px-5">
                      View Billing Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
          {!isFullHeightRoute && (
            <div className="hidden lg:block">
              <AppFooter />
            </div>
          )}
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileTabBar onOpenMore={openSidebar} hidden={hideTabBar} />
      </Suspense>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
