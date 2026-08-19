import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
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
 * GET /api/account/members/[id]/whatsapp-permissions
 *
 * Returns the WhatsApp connections accessible by this team member.
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: memberUserId } = await props.params;
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = auth;

    // Verify member belongs to same account
    const { data: targetProfile } = await supabaseAdmin()
      .from('profiles')
      .select('user_id, account_id, account_role')
      .eq('user_id', memberUserId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const isOwnerOrAdmin = targetProfile.account_role === 'owner' || targetProfile.account_role === 'admin';

    // Fetch all account connections
    const { data: allConnections } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, connection_name, phone_number_id, display_phone_number, status')
      .eq('account_id', accountId)
      .eq('is_archived', false);

    // Fetch assigned permissions
    const { data: permissions } = await supabaseAdmin()
      .from('team_whatsapp_permissions')
      .select('whatsapp_connection_id')
      .eq('user_id', memberUserId)
      .eq('account_id', accountId);

    const assignedIds = ((permissions || []) as Array<{ whatsapp_connection_id: string }>).map((p) => p.whatsapp_connection_id);

    return NextResponse.json({
      all_access: isOwnerOrAdmin,
      role: targetProfile.account_role,
      assigned_connection_ids: isOwnerOrAdmin
        ? ((allConnections || []) as Array<{ id: string }>).map((c) => c.id)
        : assignedIds,
      available_connections: allConnections || [],
    });
  } catch (error) {
    console.error('Error in GET whatsapp-permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/account/members/[id]/whatsapp-permissions
 *
 * Sets the WhatsApp connections accessible by an agent/member.
 */
export async function PUT(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: memberUserId } = await props.params;
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, accountId, role } = auth;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only account admins or owners can update member permissions.' }, { status: 403 });
    }

    // Verify member belongs to same account
    const { data: targetProfile } = await supabaseAdmin()
      .from('profiles')
      .select('user_id, account_id, account_role')
      .eq('user_id', memberUserId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const body = await request.json();
    const { connection_ids } = body;

    if (!Array.isArray(connection_ids)) {
      return NextResponse.json({ error: 'connection_ids must be an array of connection UUIDs.' }, { status: 400 });
    }

    // Verify all connection_ids belong to this account
    if (connection_ids.length > 0) {
      const { count } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .in('id', connection_ids);

      if ((count || 0) !== connection_ids.length) {
        return NextResponse.json({ error: 'One or more invalid connection IDs.' }, { status: 400 });
      }
    }

    // Delete existing permissions for this user
    await supabaseAdmin()
      .from('team_whatsapp_permissions')
      .delete()
      .eq('user_id', memberUserId)
      .eq('account_id', accountId);

    // Insert new permissions
    if (connection_ids.length > 0) {
      const rowsToInsert = connection_ids.map((cid: string) => ({
        account_id: accountId,
        user_id: memberUserId,
        whatsapp_connection_id: cid,
      }));

      const { error: insertError } = await supabaseAdmin()
        .from('team_whatsapp_permissions')
        .insert(rowsToInsert);

      if (insertError) {
        console.error('Failed to update permissions:', insertError);
        return NextResponse.json({ error: 'Failed to update member WhatsApp permissions' }, { status: 500 });
      }
    }

    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'team_member.whatsapp_access_updated',
      targetType: 'team_member',
      targetId: memberUserId,
      metadata: {
        assigned_connection_ids: connection_ids,
      },
    });

    return NextResponse.json({
      success: true,
      assigned_connection_ids: connection_ids,
    });
  } catch (error) {
    console.error('Error in PUT whatsapp-permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
