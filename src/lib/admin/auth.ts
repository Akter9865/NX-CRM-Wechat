import { cookies } from 'next/headers';
import { AdminRole, AdminPermission } from './types';
import { hasPermission } from './permissions';
import { getAdminSupabaseClient } from './admin-client';

export const ADMIN_COOKIE_NAME = 'wacrm_superadmin_session';
export const IMPERSONATION_COOKIE_NAME = 'admin_impersonate_account';

const DEFAULT_SUPERADMIN_EMAIL = 'admin@support.com';
const DEFAULT_SUPERADMIN_PASSWORD = 'admin123';

export function getFallbackSuperAdminCredentials() {
  return {
    email: process.env.SUPERADMIN_EMAIL?.trim() || DEFAULT_SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD || DEFAULT_SUPERADMIN_PASSWORD,
  };
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret =
    process.env.SUPERADMIN_JWT_SECRET ||
    process.env.ENCRYPTION_KEY ||
    'wacrm-superadmin-master-key-salt-2026';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface AdminSessionPayload {
  userId?: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions?: AdminPermission[];
  iat: number;
  exp: number;
}

export async function createAdminToken(payloadData: {
  userId?: string;
  email: string;
  fullName?: string;
  role?: AdminRole;
  permissions?: AdminPermission[];
}): Promise<string> {
  const key = await getSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    userId: payloadData.userId,
    email: payloadData.email,
    fullName: payloadData.fullName || 'Super Admin',
    role: payloadData.role || 'super_admin',
    permissions: payloadData.permissions,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days validity
  };

  const encoder = new TextEncoder();
  const headerJson = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadJson = JSON.stringify(payload);

  const headerB64 = base64UrlEncode(encoder.encode(headerJson));
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );
  const signatureB64 = base64UrlEncode(signature);

  return `${dataToSign}.${signatureB64}`;
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const dataToVerify = `${headerB64}.${payloadB64}`;
    const signatureBytes = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch (err) {
    console.error('[verifyAdminToken] error:', err);
    return null;
  }
}

/**
 * Validates admin credentials against DB admin_users or env fallback.
 */
export async function validateAdminCredentials(email: string, pass: string): Promise<AdminSessionPayload | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check DB admin_users table
  try {
    const supabase = getAdminSupabaseClient();
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', cleanEmail)
      .eq('status', 'active')
      .single();

    if (adminUser) {
      // In production, we compare with simple hash or direct match for fallback
      const matches = adminUser.password_hash === pass || adminUser.password_hash === `plain:${pass}`;
      if (matches) {
        // update last_login_at
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', adminUser.id);

        return {
          userId: adminUser.id,
          email: adminUser.email,
          fullName: adminUser.full_name,
          role: adminUser.role as AdminRole,
          permissions: (adminUser.permissions || []) as AdminPermission[],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 7 * 86400,
        };
      }
    }
  } catch (err) {
    console.error('[validateAdminCredentials] DB lookup failed, checking env fallback:', err);
  }

  // 2. Fallback to env SuperAdmin credentials
  const fallback = getFallbackSuperAdminCredentials();
  if (cleanEmail === fallback.email.toLowerCase() && pass === fallback.password) {
    return {
      email: fallback.email,
      fullName: 'Super Administrator',
      role: 'super_admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 86400,
    };
  }

  return null;
}

/**
 * Server component & Route Handler session getter
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

/**
 * Route Handler Guard enforcing permissions
 */
export async function requireAdminSession(requiredPermission?: AdminPermission): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Unauthorized admin access');
  }

  if (requiredPermission) {
    const permitted = hasPermission(session.role, requiredPermission, session.permissions);
    if (!permitted) {
      throw new Error(`Forbidden: Role ${session.role} lacks permission '${requiredPermission}'`);
    }
  }

  return session;
}
