'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MailCheck,
  KeyRound,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const callbackOrigin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${callbackOrigin}/auth/callback?next=/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <MailCheck className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Check your inbox
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            If an account exists for{' '}
            <span className="font-semibold text-foreground underline">{email}</span>, we&apos;ve sent a password reset link. Please check your spam folder if it doesn&apos;t arrive in a few minutes.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-border/80 text-foreground hover:bg-muted font-medium"
            >
              Return to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
      {/* Mobile Branding Header */}
      <div className="flex lg:hidden items-center justify-center gap-2.5 pb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card">
            <MessageSquare className="size-4 text-emerald-400" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-foreground">
            NX CRM
          </span>
          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-400">
            WeChat
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-1.5 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 mb-1">
          <KeyRound className="size-3.5" />
          <span>Account Recovery</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Forgot your <span className="text-emerald-400">password?</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a secure link to reset your password.
        </p>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 text-xs text-red-300 animate-in fade-in-50 duration-200">
          <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="email"
            autoFocus
            className="h-11 rounded-xl border-border/80 bg-muted/40 px-3.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>

        {/* Submit CTA */}
        <Button
          type="submit"
          disabled={loading}
          className="group relative mt-2 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Sending link...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>Send reset link</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          )}
        </Button>
      </form>

      {/* Back to sign in */}
      <div className="pt-2 text-center border-t border-border/50">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  );
}
