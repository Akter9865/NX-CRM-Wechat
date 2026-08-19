'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Bot, RotateCcw, Send, Loader2, UserCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  /** assistant-only: the agent signalled a human handoff on this turn. */
  handoff?: boolean;
}

export function AiPlayground({ onGoToSetup }: { onGoToSetup?: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const next: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/ai/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only role+content — the server ignores anything else.
        body: JSON.stringify({
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'ai_not_configured') {
          toast.error('No agent configured yet — finish Setup first.');
        } else {
          toast.error(data.error ?? "Couldn't get a reply.");
        }
        // Roll the unsent user turn back so the transcript stays clean.
        setTurns(turns);
        setInput(text);
        return;
      }
      setTurns([
        ...next,
        {
          role: 'assistant',
          content:
            typeof data.reply === 'string' && data.reply.trim()
              ? data.reply
              : '',
          handoff: Boolean(data.handoff),
        },
      ]);
    } catch {
      toast.error("Couldn't reach the agent.");
      setTurns(turns);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const SAMPLE_PROMPTS = [
    'Hi! Can you tell me your business hours?',
    'What services and pricing do you offer?',
    'How do I track my order or request a refund?',
    'I want to speak with a human support agent.',
  ];

  return (
    <div className="flex h-[65vh] min-h-[480px] flex-col rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-card/50 backdrop-blur-sm px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Interactive AI Simulator</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Agent
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Simulate WhatsApp customer conversations and test response quality in real-time.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTurns([])}
          disabled={turns.length === 0 || sending}
          className="rounded-xl border-border/80 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear Chat
        </Button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner">
              <Bot className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">Test your AI Agent before going live</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Your agent leverages your business instructions and knowledge base to formulate replies or trigger automated human handoffs.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                  }}
                  className="rounded-xl border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground text-left"
                >
                  💬 {prompt}
                </button>
              ))}
            </div>

            {onGoToSetup && (
              <Button
                variant="link"
                size="sm"
                onClick={onGoToSetup}
                className="mt-5 h-auto p-0 text-xs text-primary font-medium"
              >
                Configure Provider & System Prompt <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2.5',
              t.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {t.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                t.role === 'user'
                  ? 'rounded-br-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium'
                  : 'rounded-bl-sm bg-muted/80 text-foreground border border-border/60',
              )}
            >
              {t.content && <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>}
              {t.role === 'assistant' && t.handoff && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold text-amber-500',
                    t.content && 'mt-2 border-t border-border/60 pt-2',
                  )}
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>[HANDOFF TRIGGERED] Transferring to human agent</span>
                </div>
              )}
            </div>
            {t.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
                <UserCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground pl-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>AI is generating reply...</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border/80 bg-card/60 p-3.5 backdrop-blur-sm">
        <div className="flex items-end gap-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a customer message (Press Enter to send)..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
          />
          <Button
            size="sm"
            onClick={send}
            disabled={!input.trim() || sending}
            className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
