'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VisualFlowBuilder } from '@/components/automations/visual-flow-builder';
import { Button } from '@/components/ui/button';

export default function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [automation, setAutomation] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('automations')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr) throw fetchErr;
        setAutomation(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load automation');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, supabase]);

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => router.push('/automations')}>
          Back to Automations
        </Button>
      </div>
    );
  }

  if (loading || !automation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <VisualFlowBuilder automationId={id} initialData={automation} />;
}
