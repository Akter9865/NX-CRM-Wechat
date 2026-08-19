'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SuperAdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/superadmin/auth/logout', { method: 'POST' });
      toast.success('Logged out of Super Admin Portal');
      router.push('/superadmin/login');
      router.refresh();
    } catch (err) {
      console.error('[superadmin-logout] error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="h-8 rounded-xl border-border bg-card text-xs font-semibold text-muted-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin mr-1.5" />
      ) : (
        <LogOut className="size-3.5 mr-1.5" />
      )}
      <span>Logout</span>
    </Button>
  );
}
