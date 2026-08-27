import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  deleteChannelConnection,
  upsertChannelConnection,
  getAccountChannelConnections,
} from '@/lib/channels/channel-manager';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, accountId, userId } = await requireRole('admin');
    const body = await request.json();

    const connections = await getAccountChannelConnections(supabase, accountId);
    const existing = connections.find((c) => c.id === id);

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const updated = await upsertChannelConnection(supabase, {
      ...existing,
      ...body,
      id,
      account_id: accountId,
      user_id: userId,
    });

    return NextResponse.json({ success: true, connection: updated });
  } catch (error) {
    console.error('Failed to update channel connection:', error);
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, accountId } = await requireRole('admin');

    await deleteChannelConnection(supabase, accountId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete channel connection:', error);
    return toErrorResponse(error);
  }
}
