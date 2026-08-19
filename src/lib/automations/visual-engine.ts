import { createClient as createServerSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { trackOutboundMessage, checkCanExecuteAutomation } from '@/lib/billing/entitlements';

function getServiceSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';
  return createServerSupabase(url, key);
}

// In-memory per-contact execution timestamp tracker for loop protection & cooldown
const lastContactExecution = new Map<string, number>();
const contactExecutionDepth = new Map<string, number>();

const MAX_EXECUTION_DEPTH = 3;
const COOLDOWN_MS = 2000; // 2 seconds per contact

export interface VisualEngineNodeData {
  nodeType?: string;
  title?: string;
  config?: Record<string, unknown>;
}

export interface VisualEngineNode {
  id: string;
  data?: VisualEngineNodeData;
}

export interface VisualEngineEdge {
  id?: string;
  source?: string;
  target?: string;
}

export interface VisualEngineInput {
  automationId: string;
  accountId: string;
  contactId: string;
  triggerEvent: string;
  triggerData?: Record<string, unknown>;
  client?: SupabaseClient | any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Execute a published visual workflow graph in the backend.
 */
export async function executeVisualWorkflow({
  automationId,
  accountId,
  contactId,
  triggerEvent,
  triggerData: _triggerData = {},
  client,
}: VisualEngineInput) {
  const supabase = client || getServiceSupabase();

  // Subscription Active Guard: Verify account subscription is not expired/locked
  const canExec = await checkCanExecuteAutomation(accountId, supabase);
  if (!canExec.allowed) {
    console.warn(`[visual-engine] Account ${accountId} subscription inactive. Pausing automation.`);
    return { success: false, reason: 'subscription_inactive', message: canExec.reason };
  }

  // 1. Loop Protection & Recursion Guard
  const contactKey = `${accountId}:${contactId}`;
  const now = Date.now();
  const lastTime = lastContactExecution.get(contactKey) || 0;
  const currentDepth = contactExecutionDepth.get(contactKey) || 0;

  if (currentDepth >= MAX_EXECUTION_DEPTH) {
    console.warn(`[visual-engine] Max execution depth (${MAX_EXECUTION_DEPTH}) reached for contact ${contactId}. Stopping loop.`);
    return { success: false, reason: 'max_depth_exceeded' };
  }

  if (now - lastTime < COOLDOWN_MS) {
    console.warn(`[visual-engine] Cooldown active for contact ${contactId}. Ignoring duplicate event.`);
    return { success: false, reason: 'cooldown_active' };
  }

  lastContactExecution.set(contactKey, now);
  contactExecutionDepth.set(contactKey, currentDepth + 1);

  try {
    // 2. Fetch Automation & Contact details
    const [{ data: automation }, { data: contact }] = await Promise.all([
      supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase
        .from('contacts')
        .select('*, contact_tags(tags(*))')
        .eq('id', contactId)
        .eq('account_id', accountId)
        .maybeSingle(),
    ]);

    if (!automation || !contact) {
      return { success: false, reason: 'automation_or_contact_not_found' };
    }

    if (automation.status !== 'published' && !automation.is_active) {
      return { success: false, reason: 'automation_not_active' };
    }

    const canvasData = (automation.published_version || automation.canvas_data || { nodes: [], edges: [] }) as {
      nodes?: VisualEngineNode[];
      edges?: VisualEngineEdge[];
    };
    const nodes: VisualEngineNode[] = canvasData.nodes || [];
    const edges: VisualEngineEdge[] = canvasData.edges || [];

    // 3. Create Automation Run Log
    const { data: run, error: runError } = await supabase
      .from('automation_runs')
      .insert({
        account_id: accountId,
        automation_id: automationId,
        contact_id: contactId,
        trigger_event: triggerEvent,
        status: 'running',
        steps_executed: [],
      })
      .select('id')
      .single();

    if (runError || !run) {
      console.error('[visual-engine] Failed to create run record:', runError);
      return { success: false, reason: 'run_create_failed' };
    }

    const runId = run.id;
    const executedSteps: Array<{ nodeId: string; title: string; status: string }> = [];

    // 4. Find Starting Trigger Node
    const triggerNode = nodes.find((n) =>
      (n.data?.nodeType as string)?.startsWith('trigger_')
    );

    if (!triggerNode) {
      await supabase
        .from('automation_runs')
        .update({ status: 'failed', error_message: 'No trigger node found in graph', completed_at: new Date().toISOString() })
        .eq('id', runId);
      return { success: false, reason: 'no_trigger' };
    }

    executedSteps.push({
      nodeId: triggerNode.id,
      title: triggerNode.data?.title || 'Trigger',
      status: 'completed',
    });

    // 5. Traverse and Execute Downstream Nodes
    let currentNodeId: string | null = triggerNode.id;
    let stepCount = 0;

    while (currentNodeId && stepCount < 20) {
      stepCount++;
      const currentEdges = edges.filter((e) => e.source === currentNodeId);
      if (currentEdges.length === 0) break;

      const edge = currentEdges[0];
      const nextNode = nodes.find((n) => n.id === edge.target);
      if (!nextNode) break;

      const nodeType = nextNode.data?.nodeType as string;
      const config = nextNode.data?.config || {};

      try {
        // Execute Action
        if (nodeType === 'action_send_text') {
          let text = typeof config.text === 'string' ? config.text : '';
          text = text.replace(/\{\{contact\.name\}\}/g, contact.name || contact.phone || '');
          text = text.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
          text = text.replace(/\{\{contact\.email\}\}/g, contact.email || '');

          // Record step
          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Send Text',
            status: 'completed',
            input_data: { text },
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (nodeType === 'action_add_tag' && config.tagName) {
          // Add tag logic
          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Add Tag',
            status: 'completed',
            input_data: { tagName: config.tagName },
          });
        }

        executedSteps.push({
          nodeId: nextNode.id,
          title: nextNode.data?.title || nextNode.id,
          status: 'completed',
        });

        currentNodeId = nextNode.id;
      } catch (stepErr: unknown) {
        const errorMessage = stepErr instanceof Error ? stepErr.message : String(stepErr);
        console.error(`[visual-engine] Node ${nextNode.id} execution failed:`, stepErr);
        await supabase.from('automation_run_steps').insert({
          run_id: runId,
          node_id: nextNode.id,
          node_type: nodeType,
          node_title: nextNode.data?.title || nextNode.id,
          status: 'failed',
          error_message: errorMessage,
        });
        break;
      }
    }

    // 6. Complete Automation Run
    await supabase
      .from('automation_runs')
      .update({
        status: 'completed',
        steps_executed: executedSteps,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return { success: true, runId, stepsCount: executedSteps.length };
  } finally {
    contactExecutionDepth.set(contactKey, Math.max(0, (contactExecutionDepth.get(contactKey) || 1) - 1));
  }
}
