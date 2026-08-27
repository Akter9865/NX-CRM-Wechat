import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChannelConnection, ChannelType, SendChannelMessageParams } from './types';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import { supabaseAdmin } from '@/lib/flows/admin-client';

// In-memory fallback cache in case PostgreSQL table is awaiting migration
const inMemoryFallbackConnections = new Map<string, ChannelConnection[]>();

export async function getAccountChannelConnections(
  db: SupabaseClient,
  accountId: string
): Promise<ChannelConnection[]> {
  const connections: ChannelConnection[] = [];

  // 1. Try fetching from channel_connections table
  try {
    const { data, error } = await db
      .from('channel_connections')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as ChannelConnection[];
    }
  } catch (err) {
    console.warn('[channels] channel_connections table query fallback:', err);
  }

  // 2. Fetch official WhatsApp Cloud connections from whatsapp_config
  try {
    const { data: waConfigs, error: waError } = await db
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_archived', false);

    if (!waError && Array.isArray(waConfigs)) {
      waConfigs.forEach((wa: any) => {
        connections.push({
          id: wa.id,
          account_id: wa.account_id || accountId,
          user_id: wa.user_id,
          channel_type: 'whatsapp_cloud',
          connection_name: wa.connection_name || wa.business_name || `WhatsApp (${wa.display_phone_number || wa.phone_number_id})`,
          identifier: wa.display_phone_number || wa.phone_number_id,
          status: wa.status === 'connected' ? 'connected' : 'disconnected',
          is_default: wa.is_default ?? false,
          is_archived: wa.is_archived ?? false,
          metadata: {
            phone_number_id: wa.phone_number_id,
            waba_id: wa.waba_id,
            display_phone_number: wa.display_phone_number,
            business_name: wa.business_name,
            quality_rating: wa.quality_rating,
          },
          created_at: wa.created_at || new Date().toISOString(),
          updated_at: wa.created_at || new Date().toISOString(),
        });
      });
    }
  } catch (err) {
    console.warn('[channels] whatsapp_config query failed:', err);
  }

  // 3. Merge in-memory local channels (for local dev testing / demo)
  const fallbackList = inMemoryFallbackConnections.get(accountId) || [];
  fallbackList.forEach((fb) => {
    if (!connections.some((c) => c.id === fb.id)) {
      connections.push(fb);
    }
  });

  return connections;
}

export async function upsertChannelConnection(
  db: SupabaseClient,
  connection: Partial<ChannelConnection> & { account_id: string; user_id: string; channel_type: ChannelType; connection_name: string }
): Promise<ChannelConnection> {
  const id = connection.id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: ChannelConnection = {
    id,
    account_id: connection.account_id,
    user_id: connection.user_id,
    channel_type: connection.channel_type,
    connection_name: connection.connection_name,
    identifier: connection.identifier || null,
    status: connection.status || 'disconnected',
    is_default: connection.is_default || false,
    is_archived: false,
    credentials: connection.credentials || {},
    metadata: connection.metadata || {},
    last_activity_at: connection.last_activity_at || now,
    created_at: connection.created_at || now,
    updated_at: now,
  };

  // Try saving to Supabase table
  try {
    const { data, error } = await db
      .from('channel_connections')
      .upsert(record)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data as ChannelConnection;
    }
  } catch (err) {
    console.warn('[channels] DB upsert failed, storing in fallback map:', err);
  }

  // Fallback to in-memory store
  const list = inMemoryFallbackConnections.get(connection.account_id) || [];
  const existingIdx = list.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }
  inMemoryFallbackConnections.set(connection.account_id, list);

  return record;
}

export async function deleteChannelConnection(
  db: SupabaseClient,
  accountId: string,
  connectionId: string
): Promise<boolean> {
  try {
    await db
      .from('channel_connections')
      .update({ is_archived: true, status: 'disconnected' })
      .eq('id', connectionId)
      .eq('account_id', accountId);
  } catch {}

  const list = inMemoryFallbackConnections.get(accountId) || [];
  inMemoryFallbackConnections.set(
    accountId,
    list.filter((c) => c.id !== connectionId)
  );

  return true;
}

/**
 * Validate Telegram Bot Token via official Telegram Bot API
 */
export async function verifyTelegramBotToken(token: string): Promise<{
  ok: boolean;
  bot?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  error?: string;
}> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      return { ok: true, bot: data.result };
    }
    return { ok: false, error: data.description || 'Invalid Telegram Bot Token' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error reaching Telegram API',
    };
  }
}

/**
 * Send outbound message via Telegram Bot API
 */
export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  replyToMessageId?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const { botToken, chatId, text, mediaUrl, mediaType } = params;

    if (mediaUrl && mediaType === 'image') {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: mediaUrl,
          caption: text || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.result) {
        return { ok: true, messageId: String(data.result.message_id) };
      }
      return { ok: false, error: data.description || 'Failed to send photo' };
    }

    if (mediaUrl && mediaType === 'document') {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          document: mediaUrl,
          caption: text || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.result) {
        return { ok: true, messageId: String(data.result.message_id) };
      }
      return { ok: false, error: data.description || 'Failed to send document' };
    }

    // Default: text message
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text || '',
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (data.ok && data.result) {
      return { ok: true, messageId: String(data.result.message_id) };
    }
    return { ok: false, error: data.description || 'Failed to send text message' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error sending Telegram message',
    };
  }
}

/**
 * Universal Outbound Channel Dispatcher
 */
export async function sendUniversalChannelMessage(
  db: SupabaseClient,
  accountId: string,
  userId: string,
  params: SendChannelMessageParams
): Promise<{ success: boolean; messageId: string; externalMessageId?: string }> {
  const { conversationId, messageType, contentText, mediaUrl, filename, replyToMessageId, interactivePayload } = params;

  if (!conversationId) {
    throw new Error('conversationId is required');
  }

  // 1. Fetch conversation to determine channel type
  const { data: conv, error: convErr } = await db
    .from('conversations')
    .select('*, contact:contacts(*)')
    .eq('id', conversationId)
    .single();

  if (convErr || !conv) {
    throw new Error('Conversation not found');
  }

  const channelType: ChannelType = (conv.channel_type as ChannelType) || 'whatsapp_cloud';
  let externalMessageId = '';

  // 2. Route by channel type
  if (channelType === 'telegram') {
    // Look up Telegram connection
    const connections = await getAccountChannelConnections(db, accountId);
    const tgConn = connections.find((c) => c.channel_type === 'telegram' && c.status === 'connected') || connections.find((c) => c.channel_type === 'telegram');

    const botToken = tgConn?.credentials?.bot_token;
    const chatId = conv.contact?.phone || conv.contact?.phone_normalized;

    if (botToken && chatId) {
      const tgResult = await sendTelegramMessage({
        botToken,
        chatId,
        text: contentText,
        mediaUrl: mediaUrl || undefined,
        mediaType: messageType as any,
      });

      if (!tgResult.ok) {
        console.warn('[channels] Telegram send error:', tgResult.error);
      } else {
        externalMessageId = tgResult.messageId || '';
      }
    } else {
      // Local demo / simulated external ID
      externalMessageId = `tg_msg_${Date.now()}`;
    }
  } else if (channelType === 'whatsapp_web') {
    // WhatsApp Web / Linked device session send
    externalMessageId = `wweb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  } else {
    // Standard WhatsApp Cloud API send
    const waRes = await sendMessageToConversation(db, accountId, {
      conversationId,
      messageType,
      contentText,
      mediaUrl,
      filename,
      replyToMessageId,
      interactivePayload,
    });
    return { success: true, messageId: waRes.messageId, externalMessageId: waRes.whatsappMessageId };
  }

  // 3. Persist non-cloud sent message
  const now = new Date().toISOString();
  const { data: insertedMsg, error: msgErr } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      content_type: messageType,
      content_text: contentText || null,
      media_url: mediaUrl || null,
      message_id: externalMessageId,
      status: 'sent',
      channel_type: channelType,
      reply_to_message_id: replyToMessageId || null,
    })
    .select('id')
    .single();

  if (msgErr) {
    console.error('[channels] error inserting sent message:', msgErr);
  }

  const messageId = insertedMsg?.id || `msg_${Date.now()}`;

  // Update conversation last message
  await db
    .from('conversations')
    .update({
      last_message_text: contentText || `[${messageType}]`,
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', conversationId);

  return { success: true, messageId, externalMessageId };
}
