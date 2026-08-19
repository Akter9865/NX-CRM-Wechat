import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getSubscribedApps,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';

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
 * POST /api/whatsapp/connections/[id]/test
 *
 * Runs a comprehensive live health check against Meta Graph API for a connection.
 */
export async function POST(
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

    let accessToken: string;
    try {
      accessToken = decrypt(connection.access_token);
    } catch {
      await supabaseAdmin()
        .from('whatsapp_config')
        .update({
          status: 'error',
          last_error_at: new Date().toISOString(),
          last_error_message: 'Stored access token decryption failed. Server encryption key may have changed.',
        })
        .eq('id', id);

      return NextResponse.json({
        healthy: false,
        status: 'Action Required',
        message: 'Stored access token decryption failed. Please update/re-save the access token.',
        checks: {
          token_decryptable: false,
          phone_api_reachable: false,
          waba_subscribed: false,
        },
      });
    }

    const checks = {
      token_decryptable: true,
      phone_api_reachable: false,
      waba_subscribed: false,
      registered: connection.registered_at !== null,
    };

    let phoneInfo: {
      quality_rating?: string;
      display_phone_number?: string;
      verified_name?: string;
      code_verification_status?: string;
    } | null = null;
    let errorMessage: string | null = null;

    // 1. Check Phone Number metadata
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: connection.phone_number_id,
        accessToken,
      });
      checks.phone_api_reachable = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Meta API error';
    }

    // 2. Check WABA Subscribed Apps
    if (connection.waba_id && checks.phone_api_reachable) {
      try {
        const subs = await getSubscribedApps({
          wabaId: connection.waba_id,
          accessToken,
        });
        checks.waba_subscribed = subs.length > 0;
      } catch {
        checks.waba_subscribed = false;
      }
    }

    const isHealthy = checks.token_decryptable && checks.phone_api_reachable;

    // Update connection record with fresh health info
    await supabaseAdmin()
      .from('whatsapp_config')
      .update({
        status: isHealthy ? 'connected' : 'error',
        quality_rating: phoneInfo?.quality_rating ?? connection.quality_rating,
        display_phone_number: phoneInfo?.display_phone_number ?? connection.display_phone_number,
        business_name: phoneInfo?.verified_name ?? connection.business_name,
        code_verification_status: phoneInfo?.code_verification_status ?? connection.code_verification_status,
        last_api_check_at: new Date().toISOString(),
        last_error_at: isHealthy ? connection.last_error_at : new Date().toISOString(),
        last_error_message: isHealthy ? null : errorMessage,
      })
      .eq('id', id);

    return NextResponse.json({
      healthy: isHealthy,
      status: isHealthy ? 'Healthy' : 'Action Required',
      message: isHealthy
        ? `WhatsApp API connection is healthy and verified (${phoneInfo?.verified_name || phoneInfo?.display_phone_number || connection.phone_number_id}).`
        : `Connection test failed: ${errorMessage || 'Unknown Meta error'}`,
      checks,
      phone_info: phoneInfo,
      last_webhook_at: connection.last_webhook_at,
    });
  } catch (error) {
    console.error('Error in test connection route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
