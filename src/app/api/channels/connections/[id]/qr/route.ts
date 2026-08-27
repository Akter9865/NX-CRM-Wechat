import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  createOrRefreshQrSession,
  getQrSession,
} from '@/lib/channels/qr-session-manager';
import type { ChannelType } from '@/lib/channels/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRole('viewer');

    const url = new URL(request.url);
    const channelType = (url.searchParams.get('type') as ChannelType) || 'whatsapp_web';

    const session = await createOrRefreshQrSession(id, channelType);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Failed to generate QR session:', error);
    return toErrorResponse(error);
  }
}
