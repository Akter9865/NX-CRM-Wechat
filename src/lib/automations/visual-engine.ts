import { createClient as createServerSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { trackOutboundMessage, checkCanExecuteAutomation } from '@/lib/billing/entitlements';
import { engineSendText, engineSendTemplate, engineSendInteractive, engineSendMedia } from './meta-send';
import { addContactTagAndDispatch } from '@/lib/contacts/tag-events';
import { isDeliverableUrl } from '@/lib/webhooks/ssrf';
import { matchesKeyword } from '@/lib/whatsapp/keyword-matcher';

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

const MAX_EXECUTION_DEPTH = 5;
const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per contact-automation pair

export interface VisualEngineNodeData {
  type?: string;
  nodeType?: string;
  category?: string;
  title?: string;
  label?: string;
  config?: Record<string, unknown>;
}

export interface VisualEngineNode {
  id: string;
  type?: string;
  data?: VisualEngineNodeData;
}

export interface VisualEngineEdge {
  id?: string;
  source?: string;
  target?: string;
  sourceHandle?: string;
  targetHandle?: string;
  handle?: string;
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

export function getNodeType(node?: VisualEngineNode): string {
  if (!node) return '';
  return (
    (node.data?.type as string) ||
    (node.data?.nodeType as string) ||
    (node.type && node.type !== 'customNode' && node.type !== 'custom' ? node.type : '') ||
    ''
  );
}

export function getNodeTitle(node?: VisualEngineNode, fallback = 'Step'): string {
  if (!node) return fallback;
  return (
    (node.data?.label as string) ||
    (node.data?.title as string) ||
    fallback
  );
}

function evaluateVisualCondition(
  config: Record<string, any>,
  contact: Record<string, any>,
  triggerData?: Record<string, unknown>
): boolean {
  const field = (config.field || 'contact.tag').toString().toLowerCase();
  const operator = (config.operator || 'contains').toString().toLowerCase();
  const targetValue = (config.value || '').toString().toLowerCase().trim();

  let actualValue = '';
  if (field.includes('tag')) {
    const tags = Array.isArray(contact.contact_tags)
      ? contact.contact_tags
          .map((ct: any) => ct.tags?.name || ct.tag?.name || ct.name || '')
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      : '';
    actualValue = tags;
  } else if (field.includes('message') || field.includes('text')) {
    actualValue = (triggerData?.message_text || '').toString().toLowerCase();
  } else if (field.includes('name')) {
    actualValue = (contact.name || '').toString().toLowerCase();
  } else if (field.includes('phone')) {
    actualValue = (contact.phone || '').toString().toLowerCase();
  } else if (field.includes('email')) {
    actualValue = (contact.email || '').toString().toLowerCase();
  } else {
    actualValue = (contact[config.field] || '').toString().toLowerCase();
  }

  if (operator === 'equals' || operator === '=' || operator === 'exact') {
    return actualValue === targetValue;
  }
  if (operator === 'not_equals' || operator === '!=') {
    return actualValue !== targetValue;
  }
  if (operator === 'starts_with') {
    return actualValue.startsWith(targetValue);
  }
  if (operator === 'ends_with') {
    return actualValue.endsWith(targetValue);
  }
  return actualValue.includes(targetValue);
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
  triggerData = {},
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
  const contactKey = `${accountId}:${contactId}:${automationId}`;
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

    if (nodes.length === 0) {
      return { success: false, reason: 'empty_workflow_canvas' };
    }

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

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          account_id: accountId,
          user_id: automation.user_id,
          contact_id: contactId,
          status: 'open',
          unread_count: 0,
        })
        .select('id')
        .maybeSingle();
      conversationId = newConv?.id;
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
    let triggerNode = nodes.find((n) => {
      const type = getNodeType(n);
      return (
        type.startsWith('trigger_') ||
        type === 'start' ||
        n.data?.category === 'triggers'
      );
    });

    // Fallback: If no explicit trigger node, use the first root node without incoming edges
    if (!triggerNode) {
      const targets = new Set(edges.map((e) => e.target));
      triggerNode = nodes.find((n) => !targets.has(n.id)) || nodes[0];
    }

    if (!triggerNode) {
      await supabase
        .from('automation_runs')
        .update({
          status: 'failed',
          error_message: 'No trigger node found in graph',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
      return { success: false, reason: 'no_trigger' };
    }

    executedSteps.push({
      nodeId: triggerNode.id,
      title: getNodeTitle(triggerNode, 'Trigger'),
      status: 'completed',
    });

    // 5. Traverse and Execute Downstream Nodes
    let currentNodeId: string | null = triggerNode.id;
    let stepCount = 0;

    while (currentNodeId && stepCount < 30) {
      stepCount++;
      const currentEdges = edges.filter((e) => e.source === currentNodeId);
      if (currentEdges.length === 0) break;

      const currentNode = nodes.find((n) => n.id === currentNodeId);
      const currentNodeType = getNodeType(currentNode);

      let chosenEdge = currentEdges[0];

      // Handle Condition Branching
      if (currentNodeType === 'condition_match' || currentNodeType === 'condition') {
        const config = (currentNode?.data?.config || {}) as Record<string, any>;
        const conditionResult = evaluateVisualCondition(config, contact, triggerData);
        const branchHandle = conditionResult ? 'true' : 'false';

        const matchingEdge = currentEdges.find(
          (e) =>
            e.sourceHandle === branchHandle ||
            (e as any).handle === branchHandle ||
            e.sourceHandle === `source-${branchHandle}` ||
            (conditionResult && e.sourceHandle?.includes('true')) ||
            (!conditionResult && e.sourceHandle?.includes('false'))
        );

        chosenEdge = matchingEdge || currentEdges[0];
      }

      if (!chosenEdge || !chosenEdge.target) break;

      const nextNode = nodes.find((n) => n.id === chosenEdge.target);
      if (!nextNode) break;

      const nodeType = getNodeType(nextNode);
      const nodeTitle = getNodeTitle(nextNode, 'Workflow Action');
      const config = (nextNode.data?.config || {}) as Record<string, any>;

      try {
        // Execute Action: Send WhatsApp Message / Text
        if (
          nodeType === 'action_send_text' ||
          nodeType === 'action_send_message' ||
          nodeType === 'send_message'
        ) {
          let rawText =
            typeof config.message === 'string'
              ? config.message
              : typeof config.text === 'string'
                ? config.text
                : '';

          rawText = rawText.replace(/\{\{contact\.name\}\}/g, contact.name || contact.phone || '');
          rawText = rawText.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
          rawText = rawText.replace(/\{\{contact\.email\}\}/g, contact.email || '');
          rawText = rawText.replace(
            /\{\{(?:message\.text|message_text)\}\}/g,
            typeof triggerData.message_text === 'string' ? triggerData.message_text : ''
          );

          if (conversationId && rawText.trim()) {
            await engineSendText({
              accountId,
              userId: automation.user_id,
              conversationId,
              contactId,
              text: rawText,
            });
          }

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nodeTitle,
            status: 'completed',
            input_data: { text: rawText },
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (
          (nodeType === 'action_send_media' ||
            nodeType === 'action_send_image' ||
            nodeType === 'action_send_video' ||
            nodeType === 'action_send_audio' ||
            nodeType === 'action_send_document' ||
            nodeType === 'send_media') &&
          (config.mediaUrl || config.media_url || config.url || config.link) &&
          conversationId
        ) {
          const rawKind = (
            config.mediaType ||
            config.media_type ||
            (nodeType.includes('image') ? 'image' : '') ||
            (nodeType.includes('video') ? 'video' : '') ||
            (nodeType.includes('audio') ? 'audio' : '') ||
            (nodeType.includes('document') ? 'document' : '') ||
            'image'
          ) as 'image' | 'video' | 'audio' | 'document';

          let rawCaption = typeof config.caption === 'string' ? config.caption : '';
          rawCaption = rawCaption.replace(/\{\{contact\.name\}\}/g, contact.name || contact.phone || '');
          rawCaption = rawCaption.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
          rawCaption = rawCaption.replace(/\{\{contact\.email\}\}/g, contact.email || '');

          const mediaUrl = config.mediaUrl || config.media_url || config.url || config.link;

          await engineSendMedia({
            accountId,
            userId: automation.user_id,
            conversationId,
            contactId,
            kind: rawKind,
            link: mediaUrl,
            caption: rawKind !== 'audio' && rawCaption ? rawCaption : undefined,
            filename: config.filename || config.fileName,
          });

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nodeTitle,
            status: 'completed',
            input_data: { kind: rawKind, link: mediaUrl, caption: rawCaption },
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (
          (nodeType === 'action_send_interactive' || nodeType === 'send_buttons') &&
          config.buttons?.length &&
          conversationId
        ) {
          await engineSendInteractive({
            accountId,
            userId: automation.user_id,
            conversationId,
            contactId,
            payload: {
              kind: 'buttons',
              body: config.bodyText || config.body || 'Please select an option below:',
              header: config.headerText || config.header,
              footer: config.footerText || config.footer,
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
            node_title: nodeTitle,
            status: 'completed',
            input_data: config,
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (
          (nodeType === 'action_send_template' || nodeType === 'send_template') &&
          config.templateName &&
          conversationId
        ) {
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
            node_title: nodeTitle,
            status: 'completed',
            input_data: config,
          });

          await trackOutboundMessage(accountId, 1, supabase);
        } else if (nodeType === 'action_add_tag' || nodeType === 'add_tag') {
          const tagName = config.tag || config.tagName;
          let tagId = config.tagId || config.tag_id;
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
            node_title: nodeTitle,
            status: 'completed',
            input_data: { tagName, tagId },
          });
        } else if (nodeType === 'action_assign_agent' || nodeType === 'assign_agent') {
          let agentId = config.agentId || config.agent_id;
          if (!agentId || config.mode === 'round_robin') {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('account_id', accountId)
              .limit(1);
            agentId = profiles?.[0]?.user_id;
          }
          if (agentId && conversationId) {
            await supabase
              .from('conversations')
              .update({ assigned_agent_id: agentId })
              .eq('id', conversationId);
          }

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nodeTitle,
            status: 'completed',
            input_data: { agentId },
          });
        } else if (nodeType === 'action_update_stage' || nodeType === 'update_stage') {
          const stageId = config.stageId || config.stage_id;
          if (stageId) {
            await supabase
              .from('deals')
              .update({ stage_id: stageId, updated_at: new Date().toISOString() })
              .eq('account_id', accountId)
              .eq('contact_id', contactId);
          }

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nodeTitle,
            status: 'completed',
            input_data: { stageId },
          });
        } else if (nodeType === 'action_webhook' || nodeType === 'send_webhook') {
          const url = config.url;
          if (url && (await isDeliverableUrl(url))) {
            const payload = config.body ? config.body : JSON.stringify({ contact, triggerData });
            await fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json', ...(config.headers || {}) },
              body: payload,
              redirect: 'manual',
              signal: AbortSignal.timeout(8000),
            }).catch((err) => console.warn('[visual-engine] Webhook call failed:', err));
          }

          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType,
            node_title: nodeTitle,
            status: 'completed',
            input_data: { url },
          });
        } else {
          // General completed step record for other logic/action nodes
          await supabase.from('automation_run_steps').insert({
            run_id: runId,
            node_id: nextNode.id,
            node_type: nodeType || 'step',
            node_title: nodeTitle,
            status: 'completed',
            input_data: config,
          });
        }

        executedSteps.push({
          nodeId: nextNode.id,
          title: nodeTitle,
          status: 'completed',
        });

        currentNodeId = nextNode.id;
      } catch (stepErr: unknown) {
        const errorMessage = stepErr instanceof Error ? stepErr.message : String(stepErr);
        console.error(`[visual-engine] Node ${nextNode.id} execution failed:`, stepErr);
        await supabase.from('automation_run_steps').insert({
          run_id: runId,
          node_id: nextNode.id,
          node_type: nodeType || 'unknown',
          node_title: nodeTitle,
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
