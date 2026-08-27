import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import type { ChannelType } from '@/lib/channels/types';

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json();

    const {
      channel_type = 'telegram',
      sender_name = 'Alex Morgan',
      sender_identifier,
      message_text = 'Hello! Testing multichannel messaging.',
      connection_id,
    } = body as {
      channel_type: ChannelType;
      sender_name?: string;
      sender_identifier?: string;
      message_text?: string;
      connection_id?: string;
    };

    const identifier =
      sender_identifier ||
      (channel_type === 'telegram'
        ? `@alex_morgan_${Math.floor(1000 + Math.random() * 9000)}`
        : `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`);

    const now = new Date().toISOString();

    // 1. Find or create Contact
    let contactId: string;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('phone', identifier)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: cErr } = await supabase
        .from('contacts')
        .insert({
          account_id: accountId,
          user_id: userId,
          name: sender_name,
          phone: identifier,
        })
        .select('id')
        .single();

      if (cErr || !newContact) {
        throw new Error(`Failed to create contact: ${cErr?.message || 'Unknown error'}`);
      }
      contactId = newContact.id;
    }

    // 2. Find or create Conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .maybeSingle();

    let unreadCount = 1;

    if (existingConv) {
      conversationId = existingConv.id;
      unreadCount = (existingConv.unread_count || 0) + 1;
      await supabase
        .from('conversations')
        .update({
          channel_type,
          channel_connection_id: connection_id || null,
          last_message_text: message_text,
          last_message_at: now,
          unread_count: unreadCount,
          status: 'open',
          updated_at: now,
        })
        .eq('id', conversationId);
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          account_id: accountId,
          user_id: userId,
          contact_id: contactId,
          channel_type,
          channel_connection_id: connection_id || null,
          last_message_text: message_text,
          last_message_at: now,
          unread_count: 1,
          status: 'open',
        })
        .select('id')
        .single();

      if (convErr || !newConv) {
        throw new Error(`Failed to create conversation: ${convErr?.message || 'Unknown error'}`);
      }
      conversationId = newConv.id;
    }

    // 3. Insert inbound message
    const { data: insertedMsg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        content_type: 'text',
        content_text: message_text,
        channel_type,
        message_id: `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        status: 'delivered',
        created_at: now,
      })
      .select()
      .single();

    if (msgErr) {
      console.error('[channels] simulate-inbound message insert error:', msgErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Simulated inbound message delivered to inbox!',
      conversation_id: conversationId,
      message_record: insertedMsg,
    });
  } catch (error) {
    console.error('Failed to simulate inbound message:', error);
    return toErrorResponse(error);
  }
}
