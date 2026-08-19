import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api';
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
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'placeholder-service-key'
    );
  }
  return _adminClient;
}

/**
 * POST /api/whatsapp/connections/[id]/replace
 *
 * Transactionally replaces the credentials of an existing WhatsApp connection.
 * Used when a phone number is banned, rotated, or expired.
 * All historical conversations, contacts, deals, and team permissions remain intact.
 */
export async function POST(
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
      return NextResponse.json({ error: 'Only account admins or owners can replace WhatsApp connections.' }, { status: 403 });
    }

    // 1. Fetch current connection
    const { data: current, error: fetchError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      phone_number_id,
      waba_id,
      business_portfolio_id,
      access_token,
      app_id,
      app_secret,
      verify_token,
      pin,
      connection_name,
    } = body;

    if (!phone_number_id || !access_token) {
      return NextResponse.json({ error: 'New phone_number_id and access_token are required' }, { status: 400 });
    }

    // 2. Reject if another account has already claimed this new phone_number_id
    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phone_number_id)
      .eq('is_archived', false)
      .neq('id', id)
      .neq('account_id', accountId)
      .maybeSingle();

    if (claimedError) {
      console.error('Error checking phone_number_id uniqueness:', claimedError);
      return NextResponse.json({ error: 'Failed to validate phone number' }, { status: 500 });
    }

    if (claimed) {
      return NextResponse.json(
        { error: 'The new WhatsApp phone number is already active on another account.' },
        { status: 409 }
      );
    }

    // 3. Verify new credentials with Meta BEFORE applying any changes
    let phoneInfo;
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error('Meta API verification failed for replacement:', message);
      return NextResponse.json(
        { error: `Meta API verification rejected new credentials: ${message}` },
        { status: 400 }
      );
    }

    // 4. Encrypt new credentials
    let encryptedAccessToken: string;
    let encryptedVerifyToken: string | null;
    let encryptedAppSecret: string | null;
    try {
      encryptedAccessToken = encrypt(access_token);
      encryptedVerifyToken = verify_token ? encrypt(verify_token) : current.verify_token;
      encryptedAppSecret = app_secret ? encrypt(app_secret) : current.app_secret;
    } catch (err) {
      console.error('Encryption failed during replacement:', err);
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
        console.error('Meta register error during replacement:', registrationError);
      }
    }

    // 6. Subscribe WABA to this app
    let subscribedAppsAt: string | null = null;
    const effectiveWabaId = waba_id?.trim() || current.waba_id;
    if (effectiveWabaId) {
      try {
        await subscribeWabaToApp({
          wabaId: effectiveWabaId,
          accessToken: access_token,
        });
        subscribedAppsAt = new Date().toISOString();
      } catch (err) {
        console.warn('WABA subscribe warning during replacement:', err);
      }
    }

    // 7. Update connection record with new credentials and metadata
    const updatedFields = {
      phone_number_id,
      waba_id: effectiveWabaId || null,
      business_portfolio_id: business_portfolio_id?.trim() || current.business_portfolio_id,
      app_id: app_id?.trim() || current.app_id,
      app_secret: encryptedAppSecret,
      access_token: encryptedAccessToken,
      verify_token: encryptedVerifyToken,
      connection_name: connection_name?.trim() || current.connection_name || phoneInfo.verified_name || `WhatsApp (${phone_number_id.slice(-4)})`,
      display_phone_number: phoneInfo.display_phone_number || null,
      business_name: phoneInfo.verified_name || null,
      quality_rating: phoneInfo.quality_rating || null,
      code_verification_status: phoneInfo.code_verification_status || null,
      status: registrationError ? 'error' : 'connected',
      connected_at: new Date().toISOString(),
      registered_at: registeredAt || current.registered_at,
      subscribed_apps_at: subscribedAppsAt || current.subscribed_apps_at,
      last_registration_error: registrationError,
      last_error_at: registrationError ? new Date().toISOString() : null,
      last_error_message: registrationError,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabaseAdmin()
      .from('whatsapp_config')
      .update(updatedFields)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update connection in database:', updateError);
      return NextResponse.json({ error: 'Database update failed during replacement' }, { status: 500 });
    }

    // Record audit log
    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'whatsapp_connection.replaced',
      targetType: 'whatsapp_connection',
      targetId: id,
      metadata: {
        old_phone_number_id: current.phone_number_id,
        new_phone_number_id: phone_number_id,
        old_display_phone_number: current.display_phone_number,
        new_display_phone_number: phoneInfo.display_phone_number,
        connection_name: updatedFields.connection_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connection credentials replaced successfully. Conversations and history preserved.',
      connection: {
        id: updated.id,
        connection_name: updated.connection_name,
        phone_number_id: updated.phone_number_id,
        display_phone_number: updated.display_phone_number,
        business_name: updated.business_name,
        quality_rating: updated.quality_rating,
        status: updated.status,
        registered: registeredAt !== null,
        registration_error: registrationError,
      },
    });
  } catch (error) {
    console.error('Error in replace connection route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
