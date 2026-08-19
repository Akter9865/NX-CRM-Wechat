'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrength } from '@/components/auth/password-strength';
import {
  MessageSquare,
  UsersRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  MailCheck,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters');
      return;
    }

    setLoading(true);

    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : `${window.location.origin}/auth/callback`;

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
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
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We&apos;ve sent a verification link to{' '}
            <span className="font-semibold text-foreground underline">{email}</span>. Click the link to activate your NX CRM workspace.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={
              inviteToken
                ? `/login?invite=${encodeURIComponent(inviteToken)}`
                : '/login'
            }
          >
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
        {inviteToken ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 mb-1">
            <UsersRound className="size-3.5" />
            <span>Join Your Team Workspace</span>
          </div>
        ) : null}

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {inviteToken ? (
            'Create account & join'
          ) : (
            <>
              Create your <span className="text-emerald-400">account</span>
            </>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {inviteToken
            ? 'Set up your credentials to accept the team invitation.'
            : 'Start building your WhatsApp & WeChat CRM workspace today.'}
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
      <form onSubmit={handleSignup} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="name"
            autoFocus
            className="h-11 rounded-xl border-border/80 bg-muted/40 px-3.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>

        {/* Email */}
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
            className="h-11 rounded-xl border-border/80 bg-muted/40 px-3.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">
            Password
          </Label>
          <PasswordInput
            id="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="new-password"
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
              Confirm password
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
            placeholder="Repeat your password"
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
              <span>Creating account...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>Create account</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          )}
        </Button>
      </form>

      {/* Switch to Login */}
      <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/50">
        <span>Already have an account?</span>{' '}
        <Link
          href={
            inviteToken
              ? `/login?invite=${encodeURIComponent(inviteToken)}`
              : '/login'
          }
          className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
        >
          <span>Sign in</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
