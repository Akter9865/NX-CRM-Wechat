'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/auth/password-input';
import {
  MessageSquare,
  UsersRound,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const queryError = searchParams.get('error');
  const t = useTranslations('LoginPage');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(
    queryError === 'auth_callback_failed'
      ? 'Authentication session expired or invalid. Please sign in again.'
      : null
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authErr) {
      setError(
        authErr.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please double check and try again.'
          : authErr.message
      );
      setLoading(false);
      return;
    }

    // Full-page navigation so browser carries new Supabase auth cookies
    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : '/dashboard';
    window.location.href = destination;
  };

  return (
    <div className="w-full space-y-7 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
      {/* Mobile Branding Header (visible on mobile/tablet where brand panel is hidden) */}
      <div className="flex lg:hidden items-center justify-center gap-2.5 pb-2">
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
      <div className="space-y-2 text-center lg:text-left">
        {inviteToken ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 mb-1">
            <UsersRound className="size-3.5" />
            <span>Workspace Team Invitation</span>
          </div>
        ) : null}

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {inviteToken ? (
            t('titleAccept')
          ) : (
            <>
              Welcome <span className="text-emerald-400">back</span>
            </>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {inviteToken
            ? t('descAccept')
            : 'Sign in to continue to your NX CRM workspace.'}
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
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">
            {t('emailLabel')}
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
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
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-foreground">
              {t('passwordLabel')}
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            required
            autoComplete="current-password"
          />
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
            />
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Remember this device
            </span>
          </label>
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
              <span>{t('signingIn')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>{t('signIn')}</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          )}
        </Button>
      </form>

      {/* Switch to Sign Up */}
      <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/50">
        <span>{t('noAccount')}</span>{' '}
        <Link
          href={
            inviteToken
              ? `/signup?invite=${encodeURIComponent(inviteToken)}`
              : '/signup'
          }
          className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
        >
          <span>{t('createAccount')}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
