/**
 * WhatsApp Cloud API Anti-Flood, Anti-Spam & Loop Protection Guard.
 *
 * Designed to prevent automated flows or bot loops from spamming
 * customers with rapid-fire messages (e.g. 5-10 messages in seconds),
 * which is the #1 cause of Meta WhatsApp Business API account bans.
 *
 * Core Protections:
 * 1. Sliding Window Burst Guard: Max 3 automated messages per contact in 15 seconds.
 * 2. Window Throttle: Max 6 automated messages per contact in 60 seconds.
 * 3. Exact Duplicate Message Suppression: Blocks identical text sent to the same contact in < 15 seconds.
 * 4. Circuit Breaker: Automatically trips if excessive rapid bursts occur, cooling down the contact for 5 minutes.
 * 5. Natural Inter-Message Spacing: Ensures consecutive automated messages have human-like delivery pacing.
 */

interface ContactHistory {
  timestamps: number[];
  recentContentHashes: Array<{ hash: string; time: number }>;
  circuitBreakerUntil: number;
}

// In-memory sliding window history keyed by `${accountId}:${contactId}`
const contactHistories = new Map<string, ContactHistory>();

// Safety Configuration
export const ANTI_FLOOD_CONFIG = {
  MAX_MESSAGES_BURST_WINDOW_MS: 15_000, // 15 seconds
  MAX_MESSAGES_BURST_LIMIT: 3,          // Max 3 messages in 15 seconds

  MAX_MESSAGES_MINUTE_WINDOW_MS: 60_000, // 60 seconds
  MAX_MESSAGES_MINUTE_LIMIT: 6,          // Max 6 messages in 60 seconds

  DUPLICATE_SUPPRESSION_WINDOW_MS: 15_000, // 15 seconds duplicate guard
  CIRCUIT_BREAKER_COOLDOWN_MS: 300_000,    // 5 minutes cooldown if tripped
  MIN_NATURAL_SPACING_MS: 1_200,          // 1.2 seconds natural delay between consecutive bot messages
};

export interface AntiFloodCheckResult {
  allowed: boolean;
  reason?:
    | 'burst_rate_exceeded'
    | 'minute_rate_exceeded'
    | 'duplicate_message_suppressed'
    | 'circuit_breaker_active';
  retryAfterMs?: number;
}

function getFingerprint(content: string): string {
  return content.trim().toLowerCase().slice(0, 160);
}

/**
 * Check if an automated message is safe to send to this contact.
 * If safe, records the timestamp and content fingerprint.
 */
export function checkAndRecordAutomatedSend(
  accountId: string,
  contactId: string,
  content: string
): AntiFloodCheckResult {
  if (!contactId || !accountId) {
    return { allowed: true };
  }

  const key = `${accountId}:${contactId}`;
  const now = Date.now();

  let history = contactHistories.get(key);
  if (!history) {
    history = {
      timestamps: [],
      recentContentHashes: [],
      circuitBreakerUntil: 0,
    };
    contactHistories.set(key, history);
  }

  // 1. Check Circuit Breaker
  if (history.circuitBreakerUntil > now) {
    const retryAfterMs = history.circuitBreakerUntil - now;
    console.warn(
      `[anti-flood] Circuit breaker active for contact ${contactId} in account ${accountId}. Blocked automated message. Retry in ${Math.round(retryAfterMs / 1000)}s`
    );
    return {
      allowed: false,
      reason: 'circuit_breaker_active',
      retryAfterMs,
    };
  }

  // Prune expired timestamps
  const minuteWindowStart = now - ANTI_FLOOD_CONFIG.MAX_MESSAGES_MINUTE_WINDOW_MS;
  history.timestamps = history.timestamps.filter((t) => t > minuteWindowStart);

  // Prune expired content hashes
  const duplicateWindowStart = now - ANTI_FLOOD_CONFIG.DUPLICATE_SUPPRESSION_WINDOW_MS;
  history.recentContentHashes = history.recentContentHashes.filter(
    (item) => item.time > duplicateWindowStart
  );

  // 2. Check Exact Duplicate Suppression
  const fingerprint = getFingerprint(content);
  if (fingerprint.length > 0) {
    const isDuplicate = history.recentContentHashes.some(
      (item) => item.hash === fingerprint
    );
    if (isDuplicate) {
      console.warn(
        `[anti-flood] Duplicate automated message suppressed for contact ${contactId}: "${fingerprint.slice(0, 30)}..." within ${ANTI_FLOOD_CONFIG.DUPLICATE_SUPPRESSION_WINDOW_MS / 1000}s`
      );
      return {
        allowed: false,
        reason: 'duplicate_message_suppressed',
        retryAfterMs: ANTI_FLOOD_CONFIG.DUPLICATE_SUPPRESSION_WINDOW_MS,
      };
    }
  }

  // 3. Check Burst Window (15 seconds)
  const burstWindowStart = now - ANTI_FLOOD_CONFIG.MAX_MESSAGES_BURST_WINDOW_MS;
  const burstCount = history.timestamps.filter((t) => t > burstWindowStart).length;
  if (burstCount >= ANTI_FLOOD_CONFIG.MAX_MESSAGES_BURST_LIMIT) {
    // If burst count is way too high (> 5), trip the circuit breaker
    if (burstCount >= ANTI_FLOOD_CONFIG.MAX_MESSAGES_BURST_LIMIT + 2) {
      history.circuitBreakerUntil = now + ANTI_FLOOD_CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS;
      console.error(
        `[anti-flood] 🚨 EMERGENCY: Circuit breaker tripped for contact ${contactId}! Halting bot messages for 5 minutes.`
      );
    }

    return {
      allowed: false,
      reason: 'burst_rate_exceeded',
      retryAfterMs: ANTI_FLOOD_CONFIG.MAX_MESSAGES_BURST_WINDOW_MS,
    };
  }

  // 4. Check Minute Window (60 seconds)
  if (history.timestamps.length >= ANTI_FLOOD_CONFIG.MAX_MESSAGES_MINUTE_LIMIT) {
    return {
      allowed: false,
      reason: 'minute_rate_exceeded',
      retryAfterMs: ANTI_FLOOD_CONFIG.MAX_MESSAGES_MINUTE_WINDOW_MS,
    };
  }

  // Passed all checks! Record timestamp & content
  history.timestamps.push(now);
  if (fingerprint.length > 0) {
    history.recentContentHashes.push({ hash: fingerprint, time: now });
  }

  return { allowed: true };
}

/**
 * Ensures a minimum natural pacing delay before sending to avoid
 * simultaneous 0ms message bursts that trigger Meta spam detection.
 */
export async function ensureNaturalSpacing(
  accountId: string,
  contactId: string,
  minDelayMs = ANTI_FLOOD_CONFIG.MIN_NATURAL_SPACING_MS
): Promise<void> {
  const key = `${accountId}:${contactId}`;
  const history = contactHistories.get(key);
  if (!history || history.timestamps.length === 0) return;

  const lastSend = history.timestamps[history.timestamps.length - 1];
  const elapsed = Date.now() - lastSend;
  if (elapsed < minDelayMs) {
    const sleepMs = minDelayMs - elapsed;
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
}

/**
 * Reset history for unit tests or manual admin reset.
 */
export function _resetAntiFloodTrackerForTest() {
  contactHistories.clear();
}
