import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { simulateQrScan } from '@/lib/channels/qr-session-manager';
import {
  getAccountChannelConnections,
  upsertChannelConnection,
} from '@/lib/channels/channel-manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, accountId, userId } = await requireRole('admin');
    const body = await request.json().catch(() => ({}));
    const { phone_number, device_name } = body;

    const phoneNumber = phone_number || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const deviceName = device_name || 'WhatsApp Web (Chrome / macOS)';

    // Update in-memory QR session
    simulateQrScan(id, phoneNumber, deviceName);

    // Update channel connection in DB
    const connections = await getAccountChannelConnections(supabase, accountId);
    const existing = connections.find((c) => c.id === id);

    const updated = await upsertChannelConnection(supabase, {
      ...(existing || {
        channel_type: 'whatsapp_web',
        connection_name: 'WhatsApp Web',
      }),
      id,
      account_id: accountId,
      user_id: userId,
      identifier: phoneNumber,
      status: 'connected',
      metadata: {
        ...(existing?.metadata || {}),
        platform: 'WhatsApp Web',
        pushname: deviceName,
        display_phone_number: phoneNumber,
        battery: 92,
        connected_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Device successfully paired and connected!',
      connection: updated,
    });
  } catch (error) {
    console.error('Failed to simulate QR scan:', error);
    return toErrorResponse(error);
  }
}
