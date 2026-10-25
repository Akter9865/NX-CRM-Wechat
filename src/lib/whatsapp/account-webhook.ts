/**
 * Handlers for Meta WhatsApp Cloud API Account Lifecycle & Quality Webhooks.
 *
 * Fields supported:
 *   - phone_number_quality_update (FLAGGED / RESTRICTED / BANNED / UPGRADED / GREEN / YELLOW / RED)
 *   - account_update (ACCOUNT_RESTRICTION / ACCOUNT_VIOLATION / DISABLED / BANNED)
 *   - account_review_update (APPROVED / REJECTED)
 *   - phone_number_name_update
 *
 * When Meta bans or restricts an account/number, this immediately:
 *   1. Marks the connection row in `whatsapp_config` as 'banned' or 'restricted'
 *   2. Automatically engages the Emergency Safety Switch (`is_automations_paused = true`)
 *      so bot automations/flows do not continue hammering the blocked Meta API.
 *   3. Stores the exact Meta ban reason and timestamp for audit and user appeals.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const ACCOUNT_WEBHOOK_FIELDS = new Set([
  'phone_number_quality_update',
  'account_update',
  'account_review_update',
  'phone_number_name_update',
  'security',
]);

export function isAccountWebhookField(field: string): boolean {
  return ACCOUNT_WEBHOOK_FIELDS.has(field);
}

export interface PhoneNumberQualityUpdateValue {
  display_phone_number?: string;
  event?: 'FLAGGED' | 'RESTRICTED' | 'BANNED' | 'UPGRADED' | string;
  current_limit?: string;
  phone_number_id?: string;
}

export interface AccountUpdateValue {
  phone_number?: string;
  phone_number_id?: string;
  event?:
    | 'ACCOUNT_RESTRICTION'
    | 'ACCOUNT_VIOLATION'
    | 'DISABLED'
    | 'BANNED'
    | 'ACCOUNT_BANNED'
    | string;
  ban_info?: {
    waba_ban_state?: string;
    waba_ban_date?: string | number;
  };
  violation_type?: string;
  restriction_info?: Array<{
    restriction_type?: string;
    expiration_time?: number;
  }>;
}

export interface AccountWebhookChange {
  field: string;
  value: unknown;
}

/**
 * Handle incoming account lifecycle or quality webhook event.
 */
export async function handleAccountWebhookChange(
  change: AccountWebhookChange,
  supabase: SupabaseClient
): Promise<void> {
  const { field, value } = change;

  switch (field) {
    case 'phone_number_quality_update':
      await handleQualityUpdate(value as PhoneNumberQualityUpdateValue, supabase);
      break;

    case 'account_update':
      await handleAccountUpdate(value as AccountUpdateValue, supabase);
      break;

    case 'account_review_update':
      console.info('[account-webhook] account_review_update received:', value);
      break;

    default:
      console.info(`[account-webhook] unhandled account field: ${field}`, value);
      break;
  }
}

async function handleQualityUpdate(
  val: PhoneNumberQualityUpdateValue,
  supabase: SupabaseClient
) {
  if (!val) return;
  const phoneNumberId = val.phone_number_id;
  const event = String(val.event || '').toUpperCase();
  const displayPhone = val.display_phone_number;

  console.warn(
    `[account-webhook] phone_number_quality_update: event=${event}, phone_number_id=${phoneNumberId}, display=${displayPhone}`
  );

  let query = supabase.from('whatsapp_config').select('id, status, is_automations_paused');
  if (phoneNumberId) {
    query = query.eq('phone_number_id', phoneNumberId);
  } else if (displayPhone) {
    query = query.eq('display_phone_number', displayPhone);
  } else {
    return;
  }

  const { data: configs, error } = await query;
  if (error || !configs || configs.length === 0) {
    console.warn('[account-webhook] No whatsapp_config found for quality update:', val);
    return;
  }

  const now = new Date().toISOString();

  for (const config of configs) {
    const updatePayload: Record<string, unknown> = {
      updated_at: now,
      last_webhook_at: now,
    };

    if (val.current_limit) {
      updatePayload.messaging_limit_tier = val.current_limit;
    }

    if (event === 'BANNED') {
      updatePayload.status = 'banned';
      updatePayload.is_automations_paused = true; // Emergency pause automations
      updatePayload.last_error_at = now;
      updatePayload.last_error_message = `Meta WhatsApp API Banned: Phone number ${displayPhone || ''} was banned by Meta.`;
    } else if (event === 'RESTRICTED') {
      updatePayload.status = 'restricted';
      updatePayload.last_error_at = now;
      updatePayload.last_error_message = `Meta WhatsApp API Restricted: Phone number ${displayPhone || ''} messaging is restricted by Meta.`;
    } else if (event === 'FLAGGED') {
      updatePayload.quality_rating = 'RED';
      updatePayload.status = config.status === 'banned' ? 'banned' : 'flagged';
      updatePayload.last_error_at = now;
      updatePayload.last_error_message = `Meta WhatsApp API Flagged: Phone number quality degraded to RED. High risk of account ban.`;
    } else if (event === 'UPGRADED') {
      if (config.status !== 'banned') {
        updatePayload.status = 'connected';
      }
    }

    const { error: updateErr } = await supabase
      .from('whatsapp_config')
      .update(updatePayload)
      .eq('id', config.id);

    if (updateErr && updatePayload.messaging_limit_tier && updateErr.message?.includes('messaging_limit_tier')) {
      delete updatePayload.messaging_limit_tier;
      await supabase.from('whatsapp_config').update(updatePayload).eq('id', config.id);
    }
  }
}

async function handleAccountUpdate(
  val: AccountUpdateValue,
  supabase: SupabaseClient
) {
  if (!val) return;
  const event = String(val.event || '').toUpperCase();
  const phoneNumberId = val.phone_number_id;
  const phone = val.phone_number;

  console.warn(
    `[account-webhook] account_update: event=${event}, phone_number_id=${phoneNumberId}, phone=${phone}`,
    val.ban_info
  );

  let query = supabase.from('whatsapp_config').select('id, status, is_automations_paused');
  if (phoneNumberId) {
    query = query.eq('phone_number_id', phoneNumberId);
  } else if (phone) {
    query = query.eq('display_phone_number', phone);
  }

  const { data: configs, error } = await query;
  if (error || !configs || configs.length === 0) {
    // If not found by phone, might be WABA-wide ban update
    console.warn('[account-webhook] No specific whatsapp_config matched account_update:', val);
    return;
  }

  const now = new Date().toISOString();
  const isBan = event.includes('BANNED') || event.includes('DISABLED') || val.ban_info?.waba_ban_state === 'DISABLE';

  for (const config of configs) {
    const updatePayload: Record<string, unknown> = {
      updated_at: now,
      last_webhook_at: now,
    };

    if (isBan) {
      updatePayload.status = 'banned';
      updatePayload.is_automations_paused = true;
      updatePayload.last_error_at = now;
      updatePayload.last_error_message = `Meta Account Disabled/Banned: ${event}. WABA Ban State: ${val.ban_info?.waba_ban_state || 'DISABLED'}`;
    } else if (event.includes('RESTRICTION') || event.includes('VIOLATION')) {
      updatePayload.status = 'restricted';
      updatePayload.last_error_at = now;
      updatePayload.last_error_message = `Meta Policy Violation / Restriction: ${val.violation_type || event}`;
    }

    await supabase.from('whatsapp_config').update(updatePayload).eq('id', config.id);
  }
}
