import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/whatsapp/encryption';
import { logAuditEvent } from '@/lib/audit/log';

async function resolveUserAndAccount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) return null;

  return {
    user,
    accountId: profile.account_id as string,
    role: profile.account_role as string,
  };
}

let _adminClient: SupabaseClient | null = null;
function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

/**
 * GET /api/whatsapp/connections/[id]
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = auth;

    const { data: connection, error } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();

    if (error || !connection) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 });
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        connection_name: connection.connection_name,
        phone_number_id: connection.phone_number_id,
        waba_id: connection.waba_id,
        business_portfolio_id: connection.business_portfolio_id,
        app_id: connection.app_id,
        has_app_secret: Boolean(connection.app_secret),
        display_phone_number: connection.display_phone_number,
        business_name: connection.business_name,
        quality_rating: connection.quality_rating,
        code_verification_status: connection.code_verification_status,
        status: connection.status,
        is_default: connection.is_default,
        connected_at: connection.connected_at,
        registered_at: connection.registered_at,
        subscribed_apps_at: connection.subscribed_apps_at,
        last_registration_error: connection.last_registration_error,
        last_webhook_at: connection.last_webhook_at,
        last_message_received_at: connection.last_message_received_at,
        last_message_sent_at: connection.last_message_sent_at,
        mirror_inbound_media: connection.mirror_inbound_media !== false,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/whatsapp/connections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/whatsapp/connections/[id]
 *
 * Updates connection metadata (e.g. rename, update toggle).
 */
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, accountId, role } = auth;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { connection_name, is_default, mirror_inbound_media, verify_token, app_id, business_portfolio_id } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof connection_name === 'string') updates.connection_name = connection_name.trim();
    if (typeof mirror_inbound_media === 'boolean') updates.mirror_inbound_media = mirror_inbound_media;
    if (typeof is_default === 'boolean') updates.is_default = is_default;
    if (typeof app_id === 'string') updates.app_id = app_id.trim();
    if (typeof business_portfolio_id === 'string') updates.business_portfolio_id = business_portfolio_id.trim();
    if (typeof verify_token === 'string' && verify_token.trim()) {
      updates.verify_token = encrypt(verify_token.trim());
    }

    // If making default, unset other defaults in this account
    if (is_default) {
      await supabaseAdmin()
        .from('whatsapp_config')
        .update({ is_default: false })
        .eq('account_id', accountId);
    }

    const { data: updated, error } = await supabaseAdmin()
      .from('whatsapp_config')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update connection:', error);
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
    }

    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'whatsapp_connection.updated',
      targetType: 'whatsapp_connection',
      targetId: id,
      metadata: updates,
    });

    return NextResponse.json({ success: true, connection: updated });
  } catch (error) {
    console.error('Error in PUT /api/whatsapp/connections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/connections/[id]
 *
 * Soft-deactivates/archives a WhatsApp connection.
 * Preserves all historical messages and conversations.
 */
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, accountId, role } = auth;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only account admins or owners can remove WhatsApp connections.' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, connection_name, phone_number_id, display_phone_number')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Soft delete: set is_archived = true, status = 'disconnected', deleted_at = NOW()
    const { error: archiveError } = await supabaseAdmin()
      .from('whatsapp_config')
      .update({
        is_archived: true,
        status: 'disconnected',
        is_default: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', accountId);

    if (archiveError) {
      console.error('Failed to archive whatsapp connection:', archiveError);
      return NextResponse.json({ error: 'Failed to disconnect WhatsApp connection' }, { status: 500 });
    }

    // Also remove team permissions for this archived connection
    await supabaseAdmin()
      .from('team_whatsapp_permissions')
      .delete()
      .eq('whatsapp_connection_id', id);

    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'whatsapp_connection.removed',
      targetType: 'whatsapp_connection',
      targetId: id,
      metadata: {
        connection_name: existing.connection_name,
        phone_number_id: existing.phone_number_id,
        display_phone_number: existing.display_phone_number,
      },
    });

    return NextResponse.json({ success: true, message: 'WhatsApp connection disconnected and archived.' });
  } catch (error) {
    console.error('Error in DELETE /api/whatsapp/connections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
