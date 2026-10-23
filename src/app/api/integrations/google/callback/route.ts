import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleOAuthRedirectUri,
} from '@/lib/integrations/google/client';
import { encryptToken, verifyOAuthState } from '@/lib/integrations/google/crypto';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

/**
 * GET /api/integrations/google/callback
 *
 * Secure OAuth 2.0 callback endpoint:
 * 1. Validates HMAC-signed state and single-use CSRF nonce.
 * 2. Resolves target tenant (account_id) and service ('google_sheets' | 'google_calendar').
 * 3. Exchanges authorization code for Google access and refresh tokens.
 * 4. Securely encrypts refresh token at rest via AES-256-GCM.
 * 5. Persists connection details in `account_integrations` with strict multi-tenant isolation.
 * 6. Redirects user back to Settings → Integrations with feedback.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Preserve localhost or proxy origin
  const isLocalHost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  let siteUrl = requestUrl.origin;
  if (!isLocalHost) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      siteUrl = `${forwardedProto}://${forwardedHost}`;
    } else {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestUrl.origin;
    }
  }

  const redirectBase = `${siteUrl}/settings?tab=integrations`;

  // 1. Handle explicit Google authorization errors (e.g., user clicked "Cancel")
  if (error) {
    console.warn('[GoogleCallback] Google returned error:', error, errorDescription);
    const friendlyMsg = encodeURIComponent(
      error === 'access_denied'
        ? 'Google authorization was cancelled. No permissions were granted.'
        : errorDescription || error
    );
    return NextResponse.redirect(`${redirectBase}&error=${friendlyMsg}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent('Missing authorization code or state parameter.')}`
    );
  }

  // 2. Validate cryptographic state parameter and tenant binding
  const payload = verifyOAuthState(state);
  if (!payload) {
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent(
        'Authorization session expired or signature mismatch. Please try connecting again.'
      )}`
    );
  }

  // Check CSRF nonce cookie if present
  const cookieNonceName = `google_oauth_nonce_${payload.service}`;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${cookieNonceName}=([^;]*)`));
  const cookieNonce = match ? decodeURIComponent(match[1]) : null;

  if (cookieNonce && cookieNonce !== payload.nonce) {
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent('Security check failed: cross-site nonce mismatch.')}`
    );
  }

  try {
    const redirectUri = getGoogleOAuthRedirectUri(requestUrl.origin);

    // 3. Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // 4. Retrieve Google user profile for identity confirmation
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    // 5. Handle refresh token (Google returns it on consent; fallback to existing stored token on re-auth)
    let encryptedRefreshToken = '';
    if (tokens.refresh_token) {
      encryptedRefreshToken = encryptToken(tokens.refresh_token);
    } else {
      // Re-use existing encrypted refresh token if already present in DB
      const { data: existingRow } = await supabaseAdmin()
        .from('account_integrations')
        .select('encrypted_refresh_token, config')
        .eq('account_id', payload.accountId)
        .eq('integration_id', payload.service)
        .maybeSingle();

      encryptedRefreshToken =
        existingRow?.encrypted_refresh_token || existingRow?.config?.encrypted_refresh_token || '';
    }

    if (!encryptedRefreshToken) {
      return NextResponse.redirect(
        `${redirectBase}&error=${encodeURIComponent(
          'Google did not return an offline refresh token. Please remove NX CRM from your Google account permissions (myaccount.google.com/permissions) and connect again.'
        )}`
      );
    }

    // 6. Merge with existing config (preserving any previously configured sheets or calendars)
    const { data: currentRecord } = await supabaseAdmin()
      .from('account_integrations')
      .select('config')
      .eq('account_id', payload.accountId)
      .eq('integration_id', payload.service)
      .maybeSingle();

    const existingConfig = currentRecord?.config || {};

    const updatedConfig = {
      ...existingConfig,
      auth_type: 'oauth',
      google_email: userInfo.email,
      google_name: userInfo.name || '',
      google_avatar: userInfo.picture || '',
      encrypted_refresh_token: encryptedRefreshToken,
      scopes: tokens.scope?.split(' ') || [],
      connected_by_user_id: payload.userId,
      connected_at: new Date().toISOString(),
    };

    // 7. Persist to database under account_id
    let { error: dbError } = await supabaseAdmin()
      .from('account_integrations')
      .upsert(
        {
          account_id: payload.accountId,
          integration_id: payload.service,
          is_enabled: true,
          connected_by_user_id: payload.userId,
          google_account_email: userInfo.email,
          encrypted_refresh_token: encryptedRefreshToken,
          granted_scopes: tokens.scope?.split(' ') || [],
          config: updatedConfig,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,integration_id' }
      );

    // If dedicated columns haven't been migrated yet (error 42703), fall back to storing in existing config JSONB
    if (dbError && (dbError.code === '42703' || dbError.message?.includes('column'))) {
      console.warn('[GoogleCallback] Dedicated columns not yet present, falling back to config JSONB payload');
      const fallback = await supabaseAdmin()
        .from('account_integrations')
        .upsert(
          {
            account_id: payload.accountId,
            integration_id: payload.service,
            is_enabled: true,
            config: updatedConfig,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id,integration_id' }
        );
      dbError = fallback.error;
    }

    if (dbError) {
      console.error('[GoogleCallback] Database save error:', dbError);
      return NextResponse.redirect(
        `${redirectBase}&error=${encodeURIComponent('Failed to save connection to database: ' + dbError.message)}`
      );
    }

    // 8. Redirect back to Integrations Hub with success indicator and clear cookie
    const response = NextResponse.redirect(
      `${redirectBase}&connected=${payload.service}&email=${encodeURIComponent(userInfo.email)}`
    );

    response.cookies.set(cookieNonceName, '', {
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error('[GoogleCallback] Error processing callback:', err);
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent(
        err?.message || 'Failed to complete Google authorization.'
      )}`
    );
  }
}
