'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import {
  ShieldAlert,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@support.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      toast.success('Super Admin authenticated successfully');
      router.push('/superadmin');
      router.refresh();
    } catch (err: unknown) {
      console.error('[superadmin-login] error:', err);
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setEmail('admin@support.com');
    setPassword('admin123');
    setError(null);
    toast.info('Super Admin credentials loaded');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 relative overflow-hidden selection:bg-primary/20">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Master Badge Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card">
              <ShieldAlert className="size-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400 mb-2">
              <KeyRound className="size-3.5" />
              <span>Master Security Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Super Admin <span className="text-primary">Control</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Cross-tenant client management & manual subscription override
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/40 space-y-5">
          {/* Quick-fill helper banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-primary" /> Default Superadmin ID:
              </p>
              <p className="text-muted-foreground font-mono text-[11px]">
                admin@support.com / admin123
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillDefault}
              className="h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
            >
              Fill
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-medium text-foreground">
                Admin ID / Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@support.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="username"
                className="h-11 rounded-xl bg-muted/30 border-border text-foreground font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-medium text-foreground">
                Master Password
              </Label>
              <PasswordInput
                id="admin-password"
                placeholder="admin123"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Authenticating…</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Enter Super Admin Portal</span>
                  <ArrowRight className="size-4" />
                </div>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Restricted access. All actions and plan overrides are cryptographically logged.
        </p>
      </div>
    </div>
  );
}
