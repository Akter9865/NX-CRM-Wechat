'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisualFlowBuilder } from '@/components/automations/visual-flow-builder';
import { Loader2 } from 'lucide-react';

function NewAutomationContent() {
  const searchParams = useSearchParams();
  const templateSlug = searchParams.get('template');

  return <VisualFlowBuilder initialTemplateSlug={templateSlug || undefined} />;
}

export default function NewAutomationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <NewAutomationContent />
    </Suspense>
  );
}
