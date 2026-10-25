import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import {
  getAccountBotPauseStatus,
  setAccountBotPauseStatus,
  setConnectionBotPauseStatus,
} from '@/lib/whatsapp/bot-pause-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bot-reply
 *
 * Returns the account's global bot status, WhatsApp connections status,
 * and list of individual conversation overrides.
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer');

    // 1. Fetch master bot pause status & WhatsApp connections for this account
    const { isGlobalPaused, activeConfigs } = await getAccountBotPauseStatus(accountId);
    const isAnyPaused = activeConfigs.some((c) => Boolean(c.is_automations_paused));

    // 2. Fetch conversations with individual bot pause overrides
    const { data: pausedConversations, count: pausedCount } = await supabaseAdmin()
      .from('conversations')
      .select(
        'id, status, ai_autoreply_disabled, ai_handoff_summary, last_message_text, last_message_at, updated_at, contact:contacts(id, name, phone, avatar_url)',
        { count: 'exact' }
      )
      .eq('account_id', accountId)
      .eq('ai_autoreply_disabled', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    // 3. Total active conversations count
    const { count: totalConversations } = await supabaseAdmin()
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId);

    // 4. Active Flows & Automations count
    const [{ count: automationsCount }, { count: flowsCount }] = await Promise.all([
      supabaseAdmin()
        .from('automations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('is_active', true),
      supabaseAdmin()
        .from('flows')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('is_active', true),
    ]);

    return NextResponse.json({
      success: true,
      global_bot_active: !isGlobalPaused,
      is_global_paused: isGlobalPaused,
      is_partially_paused: !isGlobalPaused && isAnyPaused,
      paused_conversations_count: pausedCount || 0,
      total_conversations_count: totalConversations || 0,
      active_automations_count: (automationsCount || 0) + (flowsCount || 0),
      connections: activeConfigs.map((c) => ({
        id: c.id,
        name: c.connection_name || c.business_name || `WhatsApp (${c.phone_number_id.slice(-4)})`,
        phone: c.display_phone_number || c.phone_number_id,
        is_default: c.is_default,
        status: c.status,
        bot_active: !c.is_automations_paused,
      })),
      paused_conversations: (pausedConversations || []).map((cv) => ({
        id: cv.id,
        status: cv.status,
        last_message_text: cv.last_message_text,
        last_message_at: cv.last_message_at,
        updated_at: cv.updated_at,
        handoff_summary: cv.ai_handoff_summary,
        contact: cv.contact,
      })),
    });
  } catch (err) {
    console.error('[GET /api/bot-reply Error]:', err);
    return toErrorResponse(err);
  }
}

/**
 * POST /api/bot-reply
 *
 * Controls Master Global Bot Reply or per-chat / per-connection overrides.
 */
export async function POST(request: Request) {
  try {
    const { accountId, userId } = await requireRole('agent');
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    const now = new Date().toISOString();

    // ACTION 1: Toggle Global Bot (Master Switch)
    if (action === 'toggle_global') {
      const active = Boolean(body.active);
      const isPaused = !active;

      await setAccountBotPauseStatus(accountId, isPaused, {
        unpauseAllChats: active && Boolean(body.unpause_all_chats),
      });

      return NextResponse.json({
        success: true,
        global_bot_active: active,
        is_global_paused: isPaused,
        message: active
          ? 'Bot auto-reply and automated flows are now ACTIVE globally across all chats.'
          : 'Bot auto-reply has been completely DISABLED. All chats are now in 100% Human Agent Mode.',
      });
    }

    // ACTION 2: Toggle Bot for a specific WhatsApp connection
    if (action === 'toggle_connection') {
      const { connection_id, active } = body;
      if (!connection_id) {
        return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
      }

      await setConnectionBotPauseStatus(accountId, connection_id, !active);

      return NextResponse.json({
        success: true,
        message: active
          ? 'Bot replies activated for this number.'
          : 'Bot replies paused for this number.',
      });
    }

    // ACTION 3: Resume Bot on ALL Individual Chats
    if (action === 'resume_all_chats') {
      await supabaseAdmin()
        .from('conversations')
        .update({
          ai_autoreply_disabled: false,
          assigned_agent_id: null,
          ai_reply_count: 0,
          ai_handoff_summary: null,
          updated_at: now,
        })
        .eq('account_id', accountId);

      return NextResponse.json({
        success: true,
        message: 'All per-chat overrides cleared. Bot is now active on all customer threads.',
      });
    }

    // ACTION 4: Pause Bot on ALL Individual Chats (Human Takeover across all)
    if (action === 'pause_all_chats') {
      await supabaseAdmin()
        .from('conversations')
        .update({
          ai_autoreply_disabled: true,
          assigned_agent_id: userId,
          updated_at: now,
        })
        .eq('account_id', accountId);

      return NextResponse.json({
        success: true,
        message: 'All conversations switched to Human Agent Mode.',
      });
    }

    // ACTION 5: Toggle single conversation override
    if (action === 'toggle_chat') {
      const { conversation_id, active } = body;
      if (!conversation_id) {
        return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {
        ai_autoreply_disabled: !active,
        updated_at: now,
      };

      if (!active) {
        updateData.assigned_agent_id = userId;
      } else {
        updateData.assigned_agent_id = null;
        updateData.ai_reply_count = 0;
        updateData.ai_handoff_summary = null;
      }

      await supabaseAdmin()
        .from('conversations')
        .update(updateData)
        .eq('id', conversation_id)
        .eq('account_id', accountId);

      return NextResponse.json({
        success: true,
        message: active ? 'Bot resumed for this conversation' : 'Bot paused for this conversation (Human Agent Mode)',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/bot-reply Error]:', err);
    return toErrorResponse(err);
  }
}
