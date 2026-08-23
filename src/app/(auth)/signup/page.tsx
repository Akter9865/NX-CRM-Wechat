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

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const callbackOrigin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    const emailRedirectTo = inviteToken
      ? `${callbackOrigin}/join/${encodeURIComponent(inviteToken)}`
      : `${callbackOrigin}/auth/callback`;

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

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground font-semibold">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setError(null);
            const { error: gErr } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
            if (gErr) setError(gErr.message);
          }}
          className="h-11 w-full rounded-xl border-border bg-card hover:bg-muted/50 text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg className="size-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.54 0 2.92.54 4.02 1.43l3.01-3.01C17.21 1.74 14.77 1 12 1 7.39 1 3.51 3.63 1.63 7.42l3.66 2.84C6.18 7.32 8.84 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.67 2.84c2.14-1.98 3.75-4.89 3.75-8.66z"
            />
            <path
              fill="#FBBC05"
              d="M5.29 14.74c-.25-.74-.39-1.53-.39-2.74s.14-2 .39-2.74L1.63 6.42C.59 8.5 0 10.82 0 13.26s.59 4.76 1.63 6.84l3.66-2.84z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.67-2.84c-1.07.72-2.45 1.16-4.26 1.16-3.16 0-5.82-2.32-6.71-5.26L1.63 16C3.51 19.79 7.39 23 12 23z"
            />
          </svg>
          <span>Continue with Google</span>
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
