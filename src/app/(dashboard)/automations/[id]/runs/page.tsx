'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Workflow,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

interface AutomationRunItem {
  id: string;
  automation_id?: string;
  contact_id?: string;
  contact?: { id: string; name?: string; phone?: string };
  trigger_event?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  steps_executed?: Array<{
    title?: string;
    step_type?: string;
    nodeId?: string;
    status?: string;
    error_message?: string;
    input_data?: Record<string, unknown>;
  }>;
  error_message?: string;
}

export default function AutomationRunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [automation, setAutomation] = useState<Record<string, unknown> | null>(null);
  const [runs, setRuns] = useState<AutomationRunItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [autRes, runsRes, logsRes] = await Promise.all([
          supabase
            .from('automations')
            .select('*')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('automation_runs')
            .select('*, contact:contacts(id, name, phone)')
            .eq('automation_id', id)
            .order('started_at', { ascending: false })
            .limit(100),
          supabase
            .from('automation_logs')
            .select('*, contact:contacts(id, name, phone)')
            .eq('automation_id', id)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        if (autRes.error) throw autRes.error;
        setAutomation(autRes.data);

        // Merge visual runs and legacy logs if needed
        const combinedRuns: AutomationRunItem[] = [
          ...((runsRes.data || []) as AutomationRunItem[]),
          ...((logsRes.data || []) as Array<{
            id: string;
            automation_id?: string;
            contact_id?: string;
            contact?: { id: string; name?: string; phone?: string };
            trigger_event?: string;
            status?: string;
            created_at?: string;
            steps_executed?: Array<{
              title?: string;
              step_type?: string;
              nodeId?: string;
              status?: string;
              error_message?: string;
            }>;
            error_message?: string;
          }>).map((l) => ({
            id: l.id,
            automation_id: l.automation_id,
            contact_id: l.contact_id,
            contact: l.contact,
            trigger_event: l.trigger_event,
            status: l.status === 'success' ? 'completed' : l.status || 'unknown',
            started_at: l.created_at,
            steps_executed: l.steps_executed || [],
            error_message: l.error_message,
          })),
        ];

        setRuns(combinedRuns);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load execution runs');
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

  if (!runs || !automation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedRun = runs.find((r) => r.id === openRunId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/automations')}
            className="rounded-xl"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {(automation.name as string) || 'Automation Runs'}
              </h1>
              <Badge variant="outline" className="border-border text-xs">
                {(runs.length || 0)} total runs
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Live execution logs, triggered actions, step audits, and error diagnostic traces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/automations/${id}`}>
            <Button size="sm" className="gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
              <Workflow className="size-3.5" />
              Open Visual Canvas
            </Button>
          </Link>
        </div>
      </div>

      {/* Runs Table / List */}
      {runs.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
          <Clock className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No execution runs recorded yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Runs will be captured here in real-time as contacts match the trigger criteria of this workflow.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Trigger Event</th>
                  <th className="px-4 py-3">Executed At</th>
                  <th className="px-4 py-3">Steps</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {runs.map((run) => {
                  const isSuccess = run.status === 'completed' || run.status === 'success';
                  const isFailed = run.status === 'failed';
                  const isRunning = run.status === 'running';

                  return (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                            <CheckCircle2 className="size-3.5" />
                            Completed
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                            <XCircle className="size-3.5" />
                            Failed
                          </span>
                        )}
                        {isRunning && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500">
                            <Loader2 className="size-3.5 animate-spin" />
                            Running
                          </span>
                        )}
                        {!isSuccess && !isFailed && !isRunning && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Clock className="size-3.5" />
                            {run.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {run.contact ? (
                          <div>
                            <span className="font-medium text-foreground">{run.contact.name || run.contact.phone}</span>
                            {run.contact.name && (
                              <span className="block text-[11px] text-muted-foreground">{run.contact.phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{run.contact_id || 'System Event'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                        {run.trigger_event || 'workflow_event'}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {run.started_at ? (
                          <span title={format(new Date(run.started_at), 'yyyy-MM-dd HH:mm:ss')}>
                            {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {Array.isArray(run.steps_executed) ? run.steps_executed.length : 0} steps
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenRunId(run.id)}
                          className="h-8 rounded-lg text-xs"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Run Details Modal */}
      <Dialog open={Boolean(openRunId)} onOpenChange={(open) => !open && setOpenRunId(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Automation Run Details
            </DialogTitle>
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Status</span>
                  <span className="font-semibold text-foreground capitalize mt-0.5 block">{selectedRun.status}</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Started</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {selectedRun.started_at ? format(new Date(selectedRun.started_at), 'HH:mm:ss dd MMM') : '—'}
                  </span>
                </div>
              </div>

              {selectedRun.error_message && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {selectedRun.error_message}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step Execution Trail
                </p>
                <ul className="space-y-2">
                  {(selectedRun.steps_executed || []).map((step, i: number) => {
                    const stepOk = step.status !== 'failed';
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {stepOk ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                          <span className="font-medium text-foreground">
                            {step.title || step.step_type || step.nodeId}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {step.status || 'done'}
                        </span>
                      </li>
                    );
                  })}
                  {(!selectedRun.steps_executed || selectedRun.steps_executed.length === 0) && (
                    <li className="text-xs text-muted-foreground italic py-2">No individual step records logged.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
