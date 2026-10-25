import { supabaseAdmin } from '@/lib/automations/admin-client';

/**
 * In-memory global bot pause state store for instant consistency
 * and fallback across API routes in the Node.js runtime.
 */
const globalBotPauseCache = new Map<string, boolean>();

/**
 * Fast synchronous check against the in-memory cache.
 * Returns true only if explicitly paused.
 */
export function isAccountBotPausedSync(accountId?: string | null): boolean {
  if (!accountId) return false;
  return globalBotPauseCache.get(accountId) === true;
}

/**
 * Returns whether automations/bot replies are paused for a given account.
 * Checks in order:
 * 1. Database `accounts.is_automations_paused`
 * 2. In-memory cache (if DB column hasn't migrated or during fast transitions)
 * 3. `whatsapp_config` active rows (if all active channels are paused)
 */
export async function getAccountBotPauseStatus(accountId: string): Promise<{
  isGlobalPaused: boolean;
  accountBotPaused: boolean;
  activeConfigs: Array<{
    id: string;
    connection_name: string | null;
    business_name: string | null;
    display_phone_number: string | null;
    phone_number_id: string;
    is_default: boolean;
    status: string;
    is_automations_paused: boolean;
  }>;
}> {
  // 1. Fetch active WhatsApp connections
  const { data: configs } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('id, connection_name, business_name, display_phone_number, phone_number_id, is_default, status, is_automations_paused')
    .eq('account_id', accountId)
    .eq('is_archived', false)
    .order('is_default', { ascending: false });

  const activeConfigs = (configs || []).map((c) => ({
    ...c,
    is_automations_paused: Boolean(c.is_automations_paused),
  }));

  // 2. Fetch master setting on accounts table
  let accountPaused: boolean | null = null;
  try {
    const { data: accountRow } = await supabaseAdmin()
      .from('accounts')
      .select('is_automations_paused')
      .eq('id', accountId)
      .maybeSingle();

    if (accountRow && typeof accountRow.is_automations_paused === 'boolean') {
      accountPaused = accountRow.is_automations_paused;
      globalBotPauseCache.set(accountId, accountRow.is_automations_paused);
    }
  } catch (err) {
    console.warn('[bot-pause-service] Could not query accounts.is_automations_paused:', err);
  }

  // 3. Fallback to cache if DB didn't return an explicit boolean
  if (accountPaused === null && globalBotPauseCache.has(accountId)) {
    accountPaused = globalBotPauseCache.get(accountId)!;
  }

  // Check if all connected phone numbers are paused
  const areAllConfigsPaused =
    activeConfigs.length > 0 && activeConfigs.every((c) => Boolean(c.is_automations_paused));

  // Determine final global paused status:
  // If accountPaused was explicitly recorded, that takes precedence (covers 0 connections too!).
  // Otherwise fallback to whether all connections are paused.
  const isGlobalPaused =
    accountPaused !== null
      ? accountPaused
      : areAllConfigsPaused;

  return {
    isGlobalPaused,
    accountBotPaused: accountPaused ?? false,
    activeConfigs,
  };
}

/**
 * Persists the master global bot pause state across `accounts`, `whatsapp_config`,
 * and the in-memory cache.
 */
export async function setAccountBotPauseStatus(
  accountId: string,
  isPaused: boolean,
  options?: { unpauseAllChats?: boolean }
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update in-memory cache immediately
  globalBotPauseCache.set(accountId, isPaused);

  // 2. Update accounts table
  try {
    await supabaseAdmin()
      .from('accounts')
      .update({ is_automations_paused: isPaused, updated_at: now })
      .eq('id', accountId);
  } catch (err) {
    console.warn('[bot-pause-service] Failed to update accounts.is_automations_paused:', err);
  }

  // 3. Update all active whatsapp_config records for this account
  try {
    await supabaseAdmin()
      .from('whatsapp_config')
      .update({
        is_automations_paused: isPaused,
        updated_at: now,
      })
      .eq('account_id', accountId);
  } catch (err) {
    console.warn('[bot-pause-service] Failed to update whatsapp_config.is_automations_paused:', err);
  }

  // 4. Optionally clear conversation overrides if resuming
  if (!isPaused && options?.unpauseAllChats) {
    try {
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
    } catch (err) {
      console.warn('[bot-pause-service] Failed to unpause chats:', err);
    }
  }
}

/**
 * Toggles bot pause state for a specific WhatsApp connection.
 */
export async function setConnectionBotPauseStatus(
  accountId: string,
  connectionId: string,
  isPaused: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin()
    .from('whatsapp_config')
    .update({
      is_automations_paused: isPaused,
      updated_at: now,
    })
    .eq('id', connectionId)
    .eq('account_id', accountId);

  // If a connection is manually unpaused, master account switch should also be unpaused
  if (!isPaused) {
    globalBotPauseCache.set(accountId, false);
    try {
      await supabaseAdmin()
        .from('accounts')
        .update({ is_automations_paused: false, updated_at: now })
        .eq('id', accountId);
    } catch {}
  }
}
