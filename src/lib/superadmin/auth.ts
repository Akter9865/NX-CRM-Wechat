import { cookies } from 'next/headers';

export const SUPERADMIN_COOKIE_NAME = 'wacrm_superadmin_session';

const DEFAULT_ADMIN_EMAIL = 'admin@support.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export function getSuperAdminCredentials() {
  return {
    email: process.env.SUPERADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  };
}

// Derive a secret key for HMAC signing
async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SUPERADMIN_JWT_SECRET || process.env.ENCRYPTION_KEY || 'wacrm-superadmin-secret-key-salt-2026';
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

export interface SuperAdminSessionPayload {
  email: string;
  role: 'superadmin';
  iat: number;
  exp: number;
}

/**
 * Creates a signed cryptographic token for the superadmin.
 */
export async function createSuperAdminToken(email: string): Promise<string> {
  const key = await getSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const payload: SuperAdminSessionPayload = {
    email,
    role: 'superadmin',
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
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

/**
 * Verifies a superadmin cryptographic token.
 */
export async function verifySuperAdminToken(token: string): Promise<SuperAdminSessionPayload | null> {
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
    const payload = JSON.parse(payloadJson) as SuperAdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.role !== 'superadmin') return null;

    return payload;
  } catch (err) {
    console.error('[verifySuperAdminToken] error:', err);
    return null;
  }
}

/**
 * Validates superadmin credentials.
 */
export function validateSuperAdminCredentials(email: string, pass: string): boolean {
  const creds = getSuperAdminCredentials();
  return (
    email.trim().toLowerCase() === creds.email.toLowerCase() &&
    pass === creds.password
  );
}

/**
 * Helper to get current SuperAdmin session in Server Components and Route Handlers.
 */
export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
}

/**
 * Helper to guard SuperAdmin API Route Handlers.
 */
export async function requireSuperAdmin(): Promise<SuperAdminSessionPayload> {
  const session = await getSuperAdminSession();
  if (!session) {
    throw new Error('Unauthorized superadmin access');
  }
  return session;
}
