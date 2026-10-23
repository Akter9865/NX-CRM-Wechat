import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  decryptToken,
  encryptToken,
  signOAuthState,
  type OAuthStatePayload,
} from './crypto';

export const GOOGLE_SHEETS_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Server configuration missing: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables.'
    );
  }

  return { clientId, clientSecret };
}

export function getGoogleOAuthRedirectUri(origin?: string): string {
  // If explicitly configured, prefer environment variable
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI.trim();
  }

  // Preserve localhost or proxy origin if supplied
  const base =
    origin?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://nxcrm.online';

  return `${base}/api/integrations/google/callback`;
}

/**
 * Builds Google OAuth 2.0 authorization URL for a specific tenant and service.
 */
export function buildGoogleAuthUrl(params: {
  accountId: string;
  userId: string;
  service: 'google_sheets' | 'google_calendar';
  origin?: string;
  nonce: string;
}): { url: string; state: string } {
  const { clientId } = getGoogleOAuthCredentials();
  const redirectUri = getGoogleOAuthRedirectUri(params.origin);

  const scopes =
    params.service === 'google_sheets' ? GOOGLE_SHEETS_SCOPES : GOOGLE_CALENDAR_SCOPES;

  const statePayload: OAuthStatePayload = {
    accountId: params.accountId,
    userId: params.userId,
    service: params.service,
    nonce: params.nonce,
    timestamp: Date.now(),
  };

  const state = signOAuthState(statePayload);

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Ensures Google returns a refresh token on grant
    include_granted_scopes: 'false', // Keeps sheets and calendar scopes strictly separated
    state,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
    state,
  };
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
  sub: string;
}

/**
 * Exchanges authorization code for Google tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const errorMsg = data.error_description || data.error || 'Failed to exchange code for tokens';
    throw new Error(errorMsg);
  }

  return data as GoogleTokenResponse;
}

/**
 * Retrieves the authorized Google profile info.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve user profile from Google');
  }

  return (await res.json()) as GoogleUserInfo;
}

/**
 * In-memory token cache to prevent redundant token refreshes across requests.
 * Key: `${accountId}:${service}`
 */
interface CachedAccessToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedAccessToken>();

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

/**
 * Multi-tenant safe access token resolution.
 * Verifies integration status, decrypts refresh token, and refreshes if expired.
 */
export async function getValidAccessToken(
  accountId: string,
  service: 'google_sheets' | 'google_calendar'
): Promise<{ accessToken: string; googleEmail: string; config: Record<string, any> }> {
  const cacheKey = `${accountId}:${service}`;
  const cached = tokenCache.get(cacheKey);

  // Return cached token if valid for at least 3 more minutes
  if (cached && cached.expiresAt > Date.now() + 3 * 60 * 1000) {
    // Also pull config for caller
    const { data: record } = await supabaseAdmin()
      .from('account_integrations')
      .select('config, is_enabled')
      .eq('account_id', accountId)
      .eq('integration_id', service)
      .maybeSingle();

    if (record?.is_enabled) {
      return {
        accessToken: cached.token,
        googleEmail: record.config?.google_email || '',
        config: record.config || {},
      };
    }
  }

  // Load integration from DB
  const { data: record, error } = await supabaseAdmin()
    .from('account_integrations')
    .select('*')
    .eq('account_id', accountId)
    .eq('integration_id', service)
    .maybeSingle();

  if (error || !record) {
    throw new Error(`${service === 'google_sheets' ? 'Google Sheets' : 'Google Calendar'} is not connected for this workspace.`);
  }

  if (!record.is_enabled) {
    throw new Error(`${service === 'google_sheets' ? 'Google Sheets' : 'Google Calendar'} integration is currently disabled.`);
  }

  const encryptedRefreshToken =
    record.encrypted_refresh_token || record.config?.encrypted_refresh_token;

  if (!encryptedRefreshToken) {
    throw new Error('No refresh token found. Please reconnect your Google account.');
  }

  let plainRefreshToken = '';
  try {
    plainRefreshToken = decryptToken(encryptedRefreshToken);
  } catch (decErr) {
    console.error(`[GoogleAuth] Decryption failure for account ${accountId}:`, decErr);
    throw new Error('Encryption key mismatch: cannot decrypt stored credentials. Please reconnect your Google account.');
  }

  // Refresh token with Google
  const { clientId, clientSecret } = getGoogleOAuthCredentials();

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: plainRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const refreshData = await refreshRes.json();

  if (!refreshRes.ok || !refreshData.access_token) {
    // If revoked or invalid_grant, mark integration in error state
    if (refreshData.error === 'invalid_grant') {
      await supabaseAdmin()
        .from('account_integrations')
        .update({
          is_enabled: false,
          last_error: 'Google authorization was revoked or expired. Please reconnect.',
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('integration_id', service);
    }
    throw new Error(
      refreshData.error_description ||
        refreshData.error ||
        'Failed to refresh Google access token. Please reconnect.'
    );
  }

  const expiresInSec = refreshData.expires_in || 3600;
  const newAccessToken = refreshData.access_token;

  // Cache token in memory
  tokenCache.set(cacheKey, {
    token: newAccessToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  });

  return {
    accessToken: newAccessToken,
    googleEmail: record.google_account_email || record.config?.google_email || '',
    config: record.config || {},
  };
}

/**
 * Revokes Google OAuth token and clears credentials.
 */
export async function revokeGoogleToken(
  accountId: string,
  service: 'google_sheets' | 'google_calendar'
): Promise<void> {
  const { data: record } = await supabaseAdmin()
    .from('account_integrations')
    .select('encrypted_refresh_token, config')
    .eq('account_id', accountId)
    .eq('integration_id', service)
    .maybeSingle();

  const encryptedRefreshToken =
    record?.encrypted_refresh_token || record?.config?.encrypted_refresh_token;

  if (encryptedRefreshToken) {
    try {
      const plain = decryptToken(encryptedRefreshToken);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(plain)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (revokeErr) {
      console.warn('[GoogleAuth] Non-fatal revocation error:', revokeErr);
    }
  }

  // Invalidate cache
  tokenCache.delete(`${accountId}:${service}`);

  // Clear integration row
  await supabaseAdmin()
    .from('account_integrations')
    .update({
      is_enabled: false,
      google_account_email: null,
      encrypted_refresh_token: null,
      granted_scopes: null,
      external_resource_id: null,
      config: {},
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', accountId)
    .eq('integration_id', service);
}
