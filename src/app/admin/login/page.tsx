'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success('Admin authentication verified');
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 mx-auto">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                <ShieldAlert className="size-6 text-emerald-400" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                NX CRM Super Admin
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Authorized administrative personnel only
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Quick-fill helper banner */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-white flex items-center gap-1">
                  <KeyRound className="size-3.5 text-emerald-400" /> Default Superadmin:
                </p>
                <p className="text-slate-400 font-mono text-[11px]">
                  admin@support.com / admin123
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail('admin@support.com');
                  setPassword('admin123');
                  toast.info('Super Admin credentials filled');
                }}
                className="h-7 text-xs rounded-lg border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                Fill
              </Button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Admin Email</Label>
              <div className="relative">
                <Mail className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="admin@support.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-800 bg-slate-950 pl-10 text-xs text-white focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Admin Master Password</Label>
              <div className="relative">
                <Lock className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-800 bg-slate-950 pl-10 text-xs text-white focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
            Powered by <strong className="text-slate-400">Nexora Spark Agency</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
