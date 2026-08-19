'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  BellRing,
  CheckCircle2,
  Users,
  MessageSquare,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastsPage() {
  const [notified, setNotified] = useState(false);

  const handleNotifyMe = () => {
    setNotified(true);
    toast.success('🎉 You are on the priority notification list! We will notify you when Broadcast Campaigns launch.');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Broadcast Campaigns</h1>
            <Badge className="border border-amber-500/40 bg-amber-500/15 text-amber-400 font-extrabold text-[9px] tracking-wider px-2 py-0.5 rounded-full">
              COMING SOON
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk WhatsApp template messaging, intelligent audience segmentation, and real-time delivery analytics.
          </p>
        </div>
      </div>

      {/* Hero Coming Soon Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/20 p-8 sm:p-12 shadow-xl">
        {/* Glow Accents */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <Radio className="size-4 animate-pulse" />
            <span>Next Generation WhatsApp Outreach</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Broadcast Messaging is Coming Soon
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            We are engineering a high-throughput, Meta-compliant broadcast engine that allows you to segment your CRM audience by tags, send approved WhatsApp templates to thousands of customers simultaneously, and monitor delivery/read rates in real-time.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleNotifyMe}
              disabled={notified}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl text-xs h-10 px-5 shadow-lg shadow-primary/20"
            >
              {notified ? (
                <>
                  <CheckCircle2 className="size-4 mr-1.5 text-emerald-300" />
                  <span>Notification Preference Saved</span>
                </>
              ) : (
                <>
                  <BellRing className="size-4 mr-1.5" />
                  <span>Notify Me at Launch</span>
                </>
              )}
            </Button>

            <Link href="/pricing">
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted font-medium rounded-xl text-xs h-10 px-5"
              >
                View Eligible Plans (Business & Enterprise)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Teasers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Users className="size-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Audience Segmentation</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Target specific customer groups filtered by CRM tags, interaction history, pipeline stages, or custom attributes with zero duplicates.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MessageSquare className="size-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Bulk Template Delivery</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seamlessly dispatch Meta-approved utility, marketing, and authentication templates with dynamic personalization tags for each recipient.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BarChart3 className="size-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Campaign Analytics</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Track sent, delivered, read, and failed statuses live with webhook-verified Meta delivery receipts and recipient-level metrics.
          </p>
        </div>
      </div>

      {/* Plan Entitlement Notice */}
      <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-primary" />
            Subscription Plan Entitlement
          </h4>
          <p className="text-xs text-muted-foreground">
            Broadcast messaging and bulk campaign capabilities will be included for <span className="font-semibold text-foreground">Business (7,000 Contacts)</span> and <span className="font-semibold text-foreground">Enterprise (Unlimited)</span> subscriptions upon official feature release.
          </p>
        </div>
        <Link href="/billing">
          <Button variant="outline" size="sm" className="rounded-xl text-xs border-border shrink-0">
            Manage Subscription
          </Button>
        </Link>
      </div>
    </div>
  );
}
