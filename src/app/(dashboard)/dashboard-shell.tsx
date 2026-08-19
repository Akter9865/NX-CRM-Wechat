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
import { createClient } from "@/lib/supabase/client";
import { evaluateSubscriptionStatus, type SubscriptionStatusInfo } from "@/lib/billing/entitlements";
import { Zap, ArrowRight, Lock } from "lucide-react";
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

  const [subStatus, setSubStatus] = useState<SubscriptionStatusInfo | null>(null);

  // Check subscription status
  const refreshSubscription = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end, cancel_at_period_end')
        .eq('account_id', accountId)
        .maybeSingle();

      const evaluated = evaluateSubscriptionStatus(sub);
      setSubStatus(evaluated);
    } catch (err) {
      console.error('[DashboardShell] Error fetching subscription:', err);
    }
  }, [accountId, supabase]);

  useEffect(() => {
    let isMounted = true;
    if (!accountId) return;

    void supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_end, cancel_at_period_end')
      .eq('account_id', accountId)
      .maybeSingle()
      .then(
        ({ data: sub, error }) => {
          if (!isMounted) return;
          if (error) {
            console.error('[DashboardShell] Error fetching subscription:', error);
            return;
          }
          const evaluated = evaluateSubscriptionStatus(sub);
          setSubStatus(evaluated);
        },
        (err: unknown) => {
          if (isMounted) {
            console.error('[DashboardShell] Error fetching subscription:', err);
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

  // Determine if current page is a restricted CRM operation when subscription is locked
  const restrictedPrefixes = ['/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/flows', '/agents'];
  const isRestrictedRoute = restrictedPrefixes.some((p) => pathname.startsWith(p));
  const isLocked = subStatus?.isLocked && isRestrictedRoute;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PresenceHeartbeat />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-4 sm:p-6 flex-1 space-y-6">
            <AccountAccessAlert />

            {subStatus && (
              <SubscriptionLockBanner
                statusInfo={subStatus}
                onRenewClick={() => {
                  void refreshSubscription();
                }}
              />
            )}

            {isLocked ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 py-12">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-red-500/15 text-red-500 ring-8 ring-red-500/10 mb-6">
                  <Lock className="size-8 animate-pulse" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl max-w-md">
                  CRM Features Restricted
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-lg leading-relaxed">
                  Your subscription has expired. All stored WhatsApp conversations, contacts, and automation workflows remain safely preserved, but active operations are locked.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/pricing">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-10 px-6 shadow-lg shadow-primary/20">
                      <Zap className="size-4 mr-1.5" />
                      <span>Renew / Upgrade Subscription</span>
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
