'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const router = useRouter();
  const [impersonationData, setImpersonationData] = useState<{
    accountId: string;
    accountName: string;
    adminEmail: string;
  } | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Read admin_impersonate_account cookie
    const cookies = document.cookie.split(';');
    const cookie = cookies.find((c) => c.trim().startsWith('admin_impersonate_account='));

    if (cookie) {
      try {
        const raw = cookie.split('=')[1]?.trim();
        if (raw) {
          const jsonStr = atob(raw);
          const data = JSON.parse(jsonStr);
          if (data && data.accountName) {
            setImpersonationData(data);
          }
        }
      } catch (err) {
        console.error('[ImpersonationBanner] parse error:', err);
      }
    }
  }, []);

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch('/api/admin/impersonate/exit', { method: 'POST' });
      const data = await res.json();
      toast.success('Exited impersonation mode');
      window.location.href = data.redirectUrl || '/admin/clients';
    } catch {
      toast.error('Failed to exit impersonation');
      setExiting(false);
    }
  };

  if (!impersonationData) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shadow-lg sticky top-0 z-50 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 max-w-xl truncate">
        <Eye className="size-4 shrink-0 text-slate-950" />
        <span>
          Viewing as Admin: <strong className="underline">{impersonationData.accountName}</strong>
        </span>
        <span className="hidden sm:inline text-slate-900/80 font-normal">
          (Logged by {impersonationData.adminEmail})
        </span>
      </div>

      <Button
        size="sm"
        disabled={exiting}
        onClick={handleExit}
        className="h-7 px-3 rounded-lg bg-slate-950 hover:bg-slate-900 text-white text-[11px] font-bold shadow-sm transition-transform hover:scale-105 flex items-center gap-1.5 shrink-0"
      >
        {exiting ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <>
            <LogOut className="size-3" />
            <span>Exit Client View</span>
          </>
        )}
      </Button>
    </div>
  );
}
