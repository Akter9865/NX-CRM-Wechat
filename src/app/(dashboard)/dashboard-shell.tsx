"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
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

// Auth-gated & subscription-aware dashboard shell.
function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, accountId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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

    return () => {
      isMounted = false;
    };
  }, [accountId, supabase]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PresenceHeartbeat />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-4 sm:p-6 flex-1 space-y-6">
            <AccountAccessAlert />

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

          <AppFooter />
        </main>
      </div>
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
