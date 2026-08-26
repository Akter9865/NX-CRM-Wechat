import { createClient as createServerSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { trackOutboundMessage, checkCanExecuteAutomation } from '@/lib/billing/entitlements';
import { engineSendText, engineSendTemplate, engineSendInteractive } from './meta-send';
import { addContactTagAndDispatch } from '@/lib/contacts/tag-events';

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
  conversationId?: string;
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
  conversationId: providedConversationId,
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

    // Resolve conversationId if not provided
    let conversationId = providedConversationId;
    if (!conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      conversationId = conv?.id;
    }

    // 3. Create Automation Run Log
    const { data: run, error: runError } = await supabase
      .from('automation_runs')
      .insert({
        account_id: accountId,
        automation_id: automationId,
        contact_id: contactId,
        conversation_id: conversationId || null,
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
    const triggerNode = nodes.find((n) => {
      const type = (n.data?.nodeType as string) || '';
      return type.startsWith('trigger_') || type === 'start';
    });

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
      const config = (nextNode.data?.config || {}) as Record<string, any>;

      try {
        // Execute Action: Send WhatsApp Message
        if (nodeType === 'action_send_text' || nodeType === 'action_send_message') {
          let rawText = typeof config.message === 'string' ? config.message : typeof config.text === 'string' ? config.text : '';
          rawText = rawText.replace(/\{\{contact\.name\}\}/g, contact.name || contact.phone || '');
          rawText = rawText.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
          rawText = rawText.replace(/\{\{contact\.email\}\}/g, contact.email || '');

          if (conversationId && rawText.trim()) {
            await engineSendText({
              accountId,
              userId: automation.user_id,
              conversationId,
              contactId,
              text: rawText,
            });
          }

          // Record step
          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Send Message',
            status: 'completed',
            input_data: { text: rawText },
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (nodeType === 'action_send_interactive' && config.buttons?.length && conversationId) {
          await engineSendInteractive({
            accountId,
            userId: automation.user_id,
            conversationId,
            contactId,
            payload: {
              kind: 'buttons',
              body: config.bodyText || 'Please select an option below:',
              header: config.headerText,
              footer: config.footerText,
              buttons: config.buttons.map((b: { id: string; title: string }) => ({
                id: b.id,
                title: b.title,
              })),
            },
          });

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Send Interactive',
            status: 'completed',
            input_data: config,
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (nodeType === 'action_send_template' && config.templateName && conversationId) {
          await engineSendTemplate({
            accountId,
            userId: automation.user_id,
            conversationId,
            contactId,
            templateName: config.templateName,
            language: config.language || 'en',
          });

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Send Template',
            status: 'completed',
            input_data: config,
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (nodeType === 'action_add_tag') {
          const tagName = config.tag || config.tagName;
          let tagId = config.tagId;
          if (!tagId && tagName) {
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('account_id', accountId)
              .eq('name', tagName)
              .maybeSingle();

            if (existingTag) {
              tagId = existingTag.id;
            } else {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({ account_id: accountId, name: tagName })
                .select('id')
                .maybeSingle();
              tagId = newTag?.id;
            }
          }

          if (tagId) {
            await addContactTagAndDispatch({
              db: supabase,
              accountId,
              contactId,
              tagId,
            });
          }

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nextNode.data?.title || 'Add Tag',
            status: 'completed',
            input_data: { tagName },
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
