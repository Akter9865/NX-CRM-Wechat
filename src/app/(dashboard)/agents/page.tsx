'use client';

import { useEffect, useState } from 'react';
import { Bot, Sparkles, Settings2, BarChart3, Tag as TagIcon, Cpu } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiPlayground } from '@/components/agents/ai-playground';
import { AiUsageCard } from '@/components/agents/ai-usage';
import { AiConfig } from '@/components/settings/ai-config';
import { TagManager } from '@/components/settings/tag-manager';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';

type Tab = 'playground' | 'setup' | 'tags' | 'usage';

export default function AgentsPage() {
  const { accountRole } = useAuth();
  const canViewUsage = accountRole ? canEditSettings(accountRole) : false;
  const [tab, setTab] = useState<Tab>('playground');
  const [decided, setDecided] = useState(false);

  // Land first-time users on Setup, returning users on the Playground.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/config');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setTab(data?.configured ? 'playground' : 'setup');
        }
      } catch {
        if (!cancelled) setTab('setup');
      } finally {
        if (!cancelled) setDecided(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Modern Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 shadow-md shadow-emerald-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  AI Agents
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini & OpenAI Ready
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your bring-your-own-key intelligent assistant for smart customer replies, automated tagging, and workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/60 px-3 py-1.5 text-xs backdrop-blur-sm">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Supported Providers:</span>
            <span className="font-semibold text-foreground">Gemini • OpenAI • Claude</span>
          </div>
        </div>
      </div>

      {decided && (
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="mt-6"
        >
          <TabsList className="h-11 rounded-xl bg-muted/60 p-1 border border-border/60">
            <TabsTrigger value="playground" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Sparkles className="mr-1.5 h-4 w-4 text-emerald-500" /> Playground
            </TabsTrigger>
            <TabsTrigger value="setup" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Settings2 className="mr-1.5 h-4 w-4 text-blue-500" /> Setup & Keys
            </TabsTrigger>
            <TabsTrigger value="tags" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <TagIcon className="mr-1.5 h-4 w-4 text-cyan-500" /> CRM Tags
            </TabsTrigger>
            {canViewUsage && (
              <TabsTrigger value="usage" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BarChart3 className="mr-1.5 h-4 w-4 text-purple-500" /> Usage & Tokens
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="playground" className="mt-4 animate-in fade-in-50 duration-200">
            <AiPlayground onGoToSetup={() => setTab('setup')} />
          </TabsContent>

          <TabsContent value="setup" className="mt-4 animate-in fade-in-50 duration-200">
            <AiConfig />
          </TabsContent>

          <TabsContent value="tags" className="mt-4 animate-in fade-in-50 duration-200">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <TagIcon className="h-4 w-4 text-cyan-500" />
                  <span>CRM & AI Conversation Tags</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create and manage color-coded tags used by contacts, auto-reply rules, broadcast audiences, and AI conversation triggers.
                </p>
              </div>
              <TagManager />
            </div>
          </TabsContent>

          {canViewUsage && (
            <TabsContent value="usage" className="mt-4 animate-in fade-in-50 duration-200">
              <AiUsageCard />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
