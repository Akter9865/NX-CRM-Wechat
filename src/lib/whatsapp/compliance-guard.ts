/**
 * WhatsApp Cloud API Anti-Ban & Content Policy Compliance Guard.
 *
 * Scans outbound messages (manual inbox sends, bot automations, flows, broadcasts)
 * to detect high-risk violations of Meta WhatsApp Commerce & Business Policies:
 *
 * 1. Prohibited Gambling & Betting Exchanges (Meta Commerce Policy 4.5):
 *    Keywords: "exchange", "virat exchange", "d/w", "deposit/withdrawal",
 *    "betting id", "casino", "joining fee: ₹", "satta", "matka", etc.
 *
 * 2. URL Cloakers & Masked Anonymizer Links:
 *    Meta's automated security scanner immediately flags anonymous URL shorteners
 *    (e.g., anon.to, bit.ly, tinyurl, cutt.ly, etc.) as phishing/scam distribution.
 *
 * 3. Deceptive Identity & Financial Schemes:
 *    Promises of "Biggest opportunity", pay-to-join groups, unlicensed coaching/bets.
 */

export interface ComplianceCheckResult {
  compliant: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  ruleIds: string[];
  violations: string[];
  reasons: string[];
  details?: string;
}

// Prohibited URL shorteners & cloakers known to trigger Meta automated bans
const PROHIBITED_URL_PATTERNS = [
  /anon\.to/i,
  /bit\.ly/i,
  /tinyurl\.com/i,
  /cutt\.ly/i,
  /is\.gd/i,
  /rb\.gy/i,
  /shorturl\.at/i,
  /rebrand\.ly/i,
  /soo\.gd/i,
  /adf\.ly/i,
  /ouo\.io/i,
  /bc\.vc/i,
  /sh\.st/i,
  /adfly/i,
  /linkvertise/i,
];

// Legitimate retail customer service patterns that must NOT be flagged as betting exchanges
const LEGITIMATE_RETAIL_PATTERNS = [
  /\b(?:size|item|product|order|shoe|dress|shirt|t-shirt|garment|cloth|goods|merchandise)\s+exchange\b/i,
  /\breturn\s+(?:and|or|\/)\s+exchange\b/i,
  /\bexchange\s+(?:policy|request|process|item|product|size|window|form)\b/i,
  /\bexchange\s+(?:it|this|that)\s+for\b/i,
];

// Prohibited gambling, betting, exchange, casino, and unauthorized money schemes
const PROHIBITED_GAMBLING_PATTERNS: Array<{ ruleId: string; pattern: RegExp; reason: string }> = [
  {
    ruleId: 'META_COMMERCE_4_5_BETTING_EXCHANGE',
    pattern: /\b(?:virat|diamond|lotus|mahadev|bet|fair|sky)\s*exchange\b/i,
    reason: 'Betting Exchange / Online Gambling ID service',
  },
  {
    ruleId: 'META_COMMERCE_4_5_PROHIBITED_IDENTIFIER',
    pattern: /\bthe\s+virat\s+exchange\b/i,
    reason: 'Prohibited betting exchange identifier',
  },
  {
    ruleId: 'META_COMMERCE_4_5_DEPOSIT_WITHDRAWAL',
    pattern: /\bauto\s+service(?:\s+all\s+time)?\s+available\s*\(\s*d\s*\/\s*w\s*\)/i,
    reason: 'Deposit/Withdrawal (D/W) online betting terms',
  },
  {
    ruleId: 'META_COMMERCE_4_5_DW_NOTATION',
    pattern: /\b\(\s*d\s*\/\s*w\s*\)/i,
    reason: 'Deposit/Withdrawal (D/W) gambling transaction notation',
  },
  {
    ruleId: 'META_COMMERCE_4_5_PAY_TO_JOIN',
    pattern: /\bjoining\s+fee\s*:\s*[₹$€£]?\s*\d+/i,
    reason: 'Pay-to-join fee scheme / unlicensed financial transaction',
  },
  {
    ruleId: 'META_COMMERCE_4_5_GAMBLING_KEYWORDS',
    pattern: /\b(?:betting|casino|roulette|teen\s*patti|andar\s*bahar|satta|matka|bookie|bookmaker)\b/i,
    reason: 'Gambling, betting, or real-money gaming keywords',
  },
  {
    ruleId: 'META_COMMERCE_4_5_BETTING_ID',
    pattern: /\b(?:cricket\s*bet|ipl\s*id|betting\s*id|exchange\s*id)\b/i,
    reason: 'Online betting ID distribution',
  },
  {
    ruleId: 'META_POLICY_DECEPTIVE_FINANCIAL',
    pattern: /\b(?:100%\s*profit|guaranteed\s*return|double\s*your\s*money|biggest\s*opportunity\s*of\s*india)\b/i,
    reason: 'Deceptive financial gain / money-making claims',
  },
];

/**
 * Check text content for Meta Business Policy & Commerce Policy compliance.
 * Distinguishes genuine customer service contexts from prohibited gambling/betting schemes.
 */
export function checkContentCompliance(text: string | null | undefined): ComplianceCheckResult {
  if (!text || typeof text !== 'string') {
    return {
      compliant: true,
      riskLevel: 'safe',
      ruleIds: [],
      violations: [],
      reasons: [],
    };
  }

  const raw = text.trim();
  if (raw.length === 0) {
    return {
      compliant: true,
      riskLevel: 'safe',
      ruleIds: [],
      violations: [],
      reasons: [],
    };
  }

  // Check if this is a legitimate retail support message
  const hasRetailContext = LEGITIMATE_RETAIL_PATTERNS.some((p) => p.test(raw));
  const hasHardGamblingTerms = /\b(?:betting|casino|roulette|teen\s*patti|satta|matka|bookie|virat|diamond\s*exchange|\(\s*d\s*\/\s*w\s*\))\b/i.test(
    raw
  );

  const ruleIds: string[] = [];
  const violations: string[] = [];
  const reasons: string[] = [];

  // 1. Check for Prohibited URL Cloakers
  for (const regex of PROHIBITED_URL_PATTERNS) {
    if (regex.test(raw)) {
      ruleIds.push('META_POLICY_URL_SHORTENER_CLOAKER');
      violations.push('Masked URL / Link Shortener');
      reasons.push(
        'Contains masked / anonymous URL shortener (' +
          (raw.match(regex)?.[0] || 'cloaked link') +
          ') strictly prohibited by Meta WhatsApp Cloud API safety filters.'
      );
      break;
    }
  }

  // 2. Check for Gambling, Betting Exchange, and D/W terms
  // If legitimate retail exchange context exists and no hard gambling keywords are present, skip exchange false positives
  for (const item of PROHIBITED_GAMBLING_PATTERNS) {
    if (hasRetailContext && !hasHardGamblingTerms && item.ruleId.includes('EXCHANGE')) {
      continue;
    }

    if (item.pattern.test(raw)) {
      ruleIds.push(item.ruleId);
      violations.push(item.reason);
      reasons.push(`Contains prohibited keyword/phrase: "${raw.match(item.pattern)?.[0]}"`);
    }
  }

  // Determine risk level
  let riskLevel: ComplianceCheckResult['riskLevel'] = 'safe';
  if (violations.length >= 2 || violations.some((v) => v.includes('Betting') || v.includes('Masked URL'))) {
    riskLevel = 'critical';
  } else if (violations.length === 1) {
    riskLevel = 'high';
  }

  const compliant = riskLevel === 'safe';

  return {
    compliant,
    riskLevel,
    ruleIds,
    violations,
    reasons,
    details: !compliant
      ? `Meta Policy Warning: This message contains ${violations.length} prohibited element(s). Sending this will result in immediate WhatsApp Business Account (WABA) ban or quality degradation to RED.`
      : undefined,
  };
}
