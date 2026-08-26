import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api';
import { encrypt } from '@/lib/whatsapp/encryption';
import { checkCanAddConnection, getAccountEntitlement } from '@/lib/billing/entitlements';
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
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'placeholder-service-key'
    );
  }
  return _adminClient;
}

/**
 * GET /api/whatsapp/connections
 *
 * Lists all WhatsApp connections for the caller's organization.
 * For agents/viewers, filters down to assigned connections in team_whatsapp_permissions.
 * For owners/admins, returns all active connections for the account.
 */
export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, accountId, role } = auth;
    const isPrivileged = role === 'owner' || role === 'admin';

    const entitlement = await getAccountEntitlement(accountId);

    let query = supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    // If agent/viewer, restrict to assigned connections
    if (!isPrivileged) {
      const { data: perms } = await supabaseAdmin()
        .from('team_whatsapp_permissions')
        .select('whatsapp_connection_id')
        .eq('user_id', user.id)
        .eq('account_id', accountId);

      const allowedIds = (perms || []).map((p: { whatsapp_connection_id: string }) => p.whatsapp_connection_id);
      if (allowedIds.length === 0) {
        return NextResponse.json({
          connections: [],
          usage: {
            current: 0,
            limit: entitlement.connections.limit,
            isOverLimit: false,
          },
          plan: {
            id: entitlement.planId,
            name: entitlement.plan.name,
          },
        });
      }
      query = query.in('id', allowedIds);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Error fetching whatsapp connections:', error);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Mask tokens and sanitize
    const connections = ((rows || []) as Array<{
      id: string;
      connection_name?: string;
      business_name?: string;
      phone_number_id: string;
      waba_id?: string;
      business_portfolio_id?: string;
      app_id?: string;
      app_secret?: string;
      display_phone_number?: string;
      quality_rating?: string;
      code_verification_status?: string;
      status?: string;
      is_default?: boolean;
      connected_at?: string;
      registered_at?: string;
      subscribed_apps_at?: string;
      last_registration_error?: string;
      last_webhook_at?: string;
      last_message_received_at?: string;
      last_message_sent_at?: string;
      mirror_inbound_media?: boolean;
      created_at?: string;
      updated_at?: string;
    }>).map((row) => ({
      id: row.id,
      connection_name: row.connection_name || row.business_name || `WhatsApp (${row.phone_number_id.slice(-4)})`,
      phone_number_id: row.phone_number_id,
      waba_id: row.waba_id,
      business_portfolio_id: row.business_portfolio_id,
      app_id: row.app_id,
      has_app_secret: Boolean(row.app_secret),
      display_phone_number: row.display_phone_number,
      business_name: row.business_name,
      quality_rating: row.quality_rating,
      code_verification_status: row.code_verification_status,
      status: row.status,
      is_default: row.is_default,
      connected_at: row.connected_at,
      registered_at: row.registered_at,
      subscribed_apps_at: row.subscribed_apps_at,
      last_registration_error: row.last_registration_error,
      last_webhook_at: row.last_webhook_at,
      last_message_received_at: row.last_message_received_at,
      last_message_sent_at: row.last_message_sent_at,
      mirror_inbound_media: row.mirror_inbound_media !== false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      connections,
      usage: {
        current: entitlement.connections.current,
        limit: entitlement.connections.limit,
        isOverLimit: entitlement.connections.isOverLimit,
      },
      plan: {
        id: entitlement.planId,
        name: entitlement.plan.name,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/whatsapp/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/connections
 *
 * Adds a new WhatsApp Cloud API connection to the caller's organization.
 * Validates plan entitlement limits and verifies credentials with Meta.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, accountId, role } = auth;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only account admins or owners can add WhatsApp connections.' }, { status: 403 });
    }

    // 1. Check plan limit
    const canConnect = await checkCanAddConnection(accountId, supabaseAdmin());
    if (!canConnect.allowed) {
      return NextResponse.json(
        { error: canConnect.message || 'WhatsApp connection limit reached for your plan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      connection_name,
      phone_number_id,
      waba_id,
      business_portfolio_id,
      access_token,
      app_id,
      app_secret,
      verify_token,
      pin,
    } = body;

    if (!phone_number_id || !access_token) {
      return NextResponse.json(
        { error: 'phone_number_id and access_token are required' },
        { status: 400 }
      );
    }

    if (pin !== undefined && pin !== null && pin !== '') {
      if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
        return NextResponse.json({ error: 'PIN must be exactly 6 digits.' }, { status: 400 });
      }
    }

    // 2. Reject if another account has already claimed this phone_number_id
    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phone_number_id)
      .eq('is_archived', false)
      .neq('account_id', accountId)
      .maybeSingle();

    if (claimedError) {
      console.error('Error checking phone_number_id uniqueness:', claimedError);
      return NextResponse.json({ error: 'Failed to validate phone number' }, { status: 500 });
    }

    if (claimed) {
      return NextResponse.json(
        { error: 'This WhatsApp phone number is already active on another account.' },
        { status: 409 }
      );
    }

    // 3. Verify credentials with Meta
    let phoneInfo;
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error('Meta API verification failed:', message);
      return NextResponse.json(
        { error: `Meta API verification rejected credentials: ${message}` },
        { status: 400 }
      );
    }

    // 4. Encrypt sensitive credentials
    let encryptedAccessToken: string;
    let encryptedVerifyToken: string | null;
    let encryptedAppSecret: string | null;
    try {
      encryptedAccessToken = encrypt(access_token);
      encryptedVerifyToken = verify_token ? encrypt(verify_token) : null;
      encryptedAppSecret = app_secret ? encrypt(app_secret) : null;
    } catch (err) {
      console.error('Encryption failed:', err);
      return NextResponse.json(
        { error: 'Failed to encrypt credentials. Verify server ENCRYPTION_KEY.' },
        { status: 500 }
      );
    }

    // 5. Register with Meta for inbound webhooks (if PIN provided)
    let registeredAt: string | null = null;
    let registrationError: string | null = null;

    if (pin) {
      try {
        await registerPhoneNumber({
          phoneNumberId: phone_number_id,
          accessToken: access_token,
          pin,
        });
        registeredAt = new Date().toISOString();
      } catch (err) {
        registrationError = err instanceof Error ? err.message : 'Unknown Meta registration error';
        console.error('Meta register error:', registrationError);
      }
    }

    // 6. Subscribe WABA to this app
    let subscribedAppsAt: string | null = null;
    if (waba_id) {
      try {
        await subscribeWabaToApp({
          wabaId: waba_id,
          accessToken: access_token,
        });
        subscribedAppsAt = new Date().toISOString();
      } catch (err) {
        console.warn('WABA subscribe warning:', err);
      }
    }

    // 7. Check if this is the first connection (mark as default)
    const { count: existingCount } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_archived', false);

    const isFirstConnection = (existingCount || 0) === 0;

    const rowData = {
      account_id: accountId,
      user_id: user.id,
      connection_name: connection_name?.trim() || phoneInfo.verified_name || `WhatsApp (${phone_number_id.slice(-4)})`,
      phone_number_id,
      waba_id: waba_id?.trim() || null,
      business_portfolio_id: business_portfolio_id?.trim() || null,
      app_id: app_id?.trim() || null,
      app_secret: encryptedAppSecret,
      display_phone_number: phoneInfo.display_phone_number || null,
      business_name: phoneInfo.verified_name || null,
      quality_rating: phoneInfo.quality_rating || null,
      code_verification_status: phoneInfo.code_verification_status || null,
      access_token: encryptedAccessToken,
      verify_token: encryptedVerifyToken,
      status: registrationError ? 'error' : 'connected',
      is_default: isFirstConnection,
      is_archived: false,
      connected_at: registrationError ? null : new Date().toISOString(),
      registered_at: registeredAt,
      subscribed_apps_at: subscribedAppsAt,
      last_registration_error: registrationError,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if this phone number already exists in whatsapp_config (e.g. was previously disconnected/archived or re-added)
    const { data: existingConfig } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, account_id, is_archived')
      .eq('phone_number_id', phone_number_id)
      .maybeSingle();

    let inserted: any = null;

    if (existingConfig) {
      const { data: updated, error: updateError } = await supabaseAdmin()
        .from('whatsapp_config')
        .update({
          ...rowData,
          deleted_at: null,
          is_archived: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        console.error('Failed to reactivate whatsapp connection:', updateError);
        return NextResponse.json({ error: 'Failed to store WhatsApp connection in database' }, { status: 500 });
      }
      inserted = updated;
    } else {
      const { data: created, error: insertError } = await supabaseAdmin()
        .from('whatsapp_config')
        .insert(rowData)
        .select('*')
        .single();

      if (insertError || !created) {
        console.error('Failed to insert whatsapp connection:', insertError);
        return NextResponse.json({ error: 'Failed to store WhatsApp connection in database' }, { status: 500 });
      }
      inserted = created;
    }

    // Record audit log
    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'whatsapp_connection.created',
      targetType: 'whatsapp_connection',
      targetId: inserted.id,
      metadata: {
        connection_name: rowData.connection_name,
        phone_number_id,
        display_phone_number: phoneInfo.display_phone_number,
        verified_name: phoneInfo.verified_name,
      },
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: inserted.id,
        connection_name: inserted.connection_name,
        phone_number_id: inserted.phone_number_id,
        display_phone_number: inserted.display_phone_number,
        business_name: inserted.business_name,
        quality_rating: inserted.quality_rating,
        status: inserted.status,
        registered: registeredAt !== null,
        registration_error: registrationError,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/whatsapp/connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
