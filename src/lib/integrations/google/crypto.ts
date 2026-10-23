import crypto from 'crypto';

/**
 * Multi-Tenant Security & Encryption for Google OAuth integrations.
 *
 * All refresh tokens are encrypted at rest using AES-256-GCM with a 12-byte IV
 * and 16-byte authentication tag to prevent tampering.
 *
 * OAuth state values are cryptographically signed using HMAC-SHA256 and bind
 * the initiating user, workspace account_id, service, and a single-use nonce
 * with a strict 10-minute expiration window to defeat CSRF and cross-tenant attacks.
 */

const RAW_KEY =
  process.env.TOKEN_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_KEY ||
  '0d47217e85683a06997437cc11e251806b377951e6c9fcd5d3a11eb757ab720e';

function get32ByteKey(): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(RAW_KEY)) {
    return Buffer.from(RAW_KEY, 'hex');
  }
  return crypto.createHash('sha256').update(RAW_KEY).digest();
}

const GCM_IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStatePayload {
  accountId: string;
  userId: string;
  service: 'google_sheets' | 'google_calendar';
  nonce: string;
  timestamp: number;
}

/**
 * Encrypt sensitive token at rest using AES-256-GCM.
 * Output format: `<iv-hex>:<ciphertext-hex>:<authTag-hex>`
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', get32ByteKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt token encrypted with AES-256-GCM.
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, ctHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  if (iv.length !== GCM_IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Corrupted encryption headers or authentication tag');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', get32ByteKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ctHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a signed single-use OAuth state token.
 */
export function signOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  const base64Data = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', get32ByteKey())
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Verify and parse an OAuth state token. Returns null if invalid or expired.
 */
export function verifyOAuthState(stateString: string): OAuthStatePayload | null {
  try {
    if (!stateString || !stateString.includes('.')) return null;

    const [base64Data, signature] = stateString.split('.');
    if (!base64Data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', get32ByteKey())
      .update(base64Data)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const json = Buffer.from(base64Data, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as OAuthStatePayload;

    if (!payload.accountId || !payload.userId || !payload.service || !payload.nonce) {
      return null;
    }

    // Expiry check (10 minutes)
    if (Date.now() - payload.timestamp > STATE_MAX_AGE_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
