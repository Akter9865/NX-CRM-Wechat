import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { sendUniversalChannelMessage } from '@/lib/channels/channel-manager';

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const body = await request.json();

    const result = await sendUniversalChannelMessage(supabase, accountId, userId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in unified channel send POST:', error);
    return toErrorResponse(error);
  }
}
