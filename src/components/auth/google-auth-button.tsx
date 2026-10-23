'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GoogleIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  inviteToken?: string | null;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function GoogleAuthButton({
  mode = 'signin',
  inviteToken,
  onError,
  disabled = false,
  className,
  label,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);

      const destination = inviteToken
        ? `/join/${encodeURIComponent(inviteToken)}`
        : '/dashboard';

      // Always pass the current origin for callback so localhost stays on localhost
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://nxcrm.online');

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(destination)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setLoading(false);
        onError?.(error.message);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      onError?.(msg);
    }
  };

  const buttonText =
    label ||
    (mode === 'signin' ? 'Continue with Google' : 'Sign up with Google');

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      onClick={handleGoogleAuth}
      className={cn(
        'relative h-11 w-full rounded-xl border-border/80 bg-background/50 font-medium text-foreground transition-all duration-200 hover:bg-muted/70 hover:border-border active:scale-[0.99] disabled:opacity-60 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-center gap-3">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <GoogleIcon className="size-4 shrink-0" />
        )}
        <span className="text-sm font-semibold tracking-tight">{buttonText}</span>
      </div>
    </Button>
  );
}
