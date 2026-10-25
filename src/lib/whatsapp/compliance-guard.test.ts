import { describe, it, expect } from 'vitest';
import { checkContentCompliance } from './compliance-guard';

describe('checkContentCompliance', () => {
  it('returns safe for normal conversational and business messages', () => {
    const text = 'Hello! Thank you for reaching out to Yellow Clothing Ltd. How can I help you today?';
    const result = checkContentCompliance(text);
    expect(result.compliant).toBe(true);
    expect(result.riskLevel).toBe('safe');
    expect(result.violations).toHaveLength(0);
  });

  it('detects the exact prohibited message from Screenshot 1', () => {
    const viralSpamMessage = `WELCOME TO
⚡ THE VIRAT EXCHANGE 24X7 ⚡
🇮🇳 INDIA'S MOST TRUSTED COACHING CENTRE
━━━━━━━ ❖ ━━━━━━━
🏆 BIGGEST OPPORTUNITY OF INDIA (2013)
⚡ AUTO SERVICE ALL TIME AVAILABLE (D/W)
🔗 JOIN NOW:
https://anon.to/fC1W8r
💰 JOINING FEE: ₹100 ✅
━━━━━━━ ❖ ━━━━━━━
❖THANKS FOR TRUSTING US❖`;

    const result = checkContentCompliance(viralSpamMessage);
    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
    expect(result.violations.some((v) => v.includes('Masked URL'))).toBe(true);
    expect(result.violations.some((v) => v.includes('Exchange') || v.includes('Betting'))).toBe(true);
    expect(result.violations.some((v) => v.includes('D/W') || v.includes('Deposit/Withdrawal'))).toBe(true);
  });

  it('flags prohibited url shorteners like bit.ly and tinyurl', () => {
    const text = 'Check out our new catalog here: https://bit.ly/3xyz';
    const result = checkContentCompliance(text);
    expect(result.compliant).toBe(false);
    expect(result.violations).toContain('Masked URL / Link Shortener');
  });

  it('flags betting, casino, and cricket exchange keywords', () => {
    const text = 'Get your Cricket Betting ID now! Auto D/W service 24x7.';
    const result = checkContentCompliance(text);
    expect(result.compliant).toBe(false);
    expect(result.riskLevel).toBe('critical');
  });
});
