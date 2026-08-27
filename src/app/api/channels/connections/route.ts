import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  getAccountChannelConnections,
  upsertChannelConnection,
  verifyTelegramBotToken,
} from '@/lib/channels/channel-manager';
import type { ChannelType } from '@/lib/channels/types';

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer');
    const connections = await getAccountChannelConnections(supabase, accountId);
    return NextResponse.json({ success: true, connections });
  } catch (error) {
    console.error('Failed to get channel connections:', error);
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');
    const body = await request.json();
    const {
      channel_type,
      connection_name,
      identifier,
      credentials,
      metadata,
      is_default,
    } = body as {
      channel_type: ChannelType;
      connection_name: string;
      identifier?: string;
      credentials?: Record<string, any>;
      metadata?: Record<string, any>;
      is_default?: boolean;
    };

    if (!channel_type || !connection_name) {
      return NextResponse.json(
        { error: 'channel_type and connection_name are required' },
        { status: 400 }
      );
    }

    let status = 'disconnected';
    const connMetadata = { ...(metadata || {}) };

    // If Telegram bot token provided, verify it immediately
    if (channel_type === 'telegram' && credentials?.bot_token) {
      const verify = await verifyTelegramBotToken(credentials.bot_token);
      if (!verify.ok) {
        return NextResponse.json(
          { error: verify.error || 'Invalid Telegram Bot Token' },
          { status: 400 }
        );
      }
      status = 'connected';
      connMetadata.bot_id = verify.bot?.id;
      connMetadata.bot_username = verify.bot?.username;
      connMetadata.bot_name = verify.bot?.first_name;
    } else if (channel_type === 'whatsapp_web') {
      status = 'pairing';
    }

    const connection = await upsertChannelConnection(supabase, {
      account_id: accountId,
      user_id: userId,
      channel_type,
      connection_name,
      identifier: identifier || connMetadata.bot_username || null,
      status: status as any,
      is_default: is_default ?? false,
      credentials: credentials || {},
      metadata: connMetadata,
    });

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error('Failed to create channel connection:', error);
    return toErrorResponse(error);
  }
}
