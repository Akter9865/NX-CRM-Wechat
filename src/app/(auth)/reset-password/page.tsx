'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrength } from '@/components/auth/password-strength';
import {
  MessageSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
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
          <CheckCircle2 className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Password updated
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your password has been successfully reset. You can now access your NX CRM workspace.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/dashboard">
            <Button className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90">
              Continue to workspace &rarr;
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
          <span>New Password</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Set new <span className="text-emerald-400">password</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below to secure your NX CRM account.
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
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">
            New password
          </Label>
          <PasswordInput
            id="password"
            placeholder="Create a new password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="new-password"
            autoFocus
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
              Confirm new password
            </Label>
            {passwordsMatch && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle className="size-3" />
                Passwords match
              </span>
            )}
            {passwordsMismatch && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
                <XCircle className="size-3" />
                Passwords don&apos;t match
              </span>
            )}
          </div>
          <PasswordInput
            id="confirmPassword"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="new-password"
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
              <span>Updating password...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>Update password</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
