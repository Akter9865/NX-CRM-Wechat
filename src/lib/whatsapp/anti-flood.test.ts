import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAndRecordAutomatedSend,
  _resetAntiFloodTrackerForTest,
  ANTI_FLOOD_CONFIG,
} from './anti-flood';

describe('WhatsApp Anti-Flood & Loop Protection Guard', () => {
  beforeEach(() => {
    _resetAntiFloodTrackerForTest();
    vi.restoreAllMocks();
  });

  it('allows normal message sends within limits', () => {
    const res1 = checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Hello there');
    expect(res1.allowed).toBe(true);

    const res2 = checkAndRecordAutomatedSend('acc-1', 'contact-1', 'How can I assist?');
    expect(res2.allowed).toBe(true);
  });

  it('suppresses exact duplicate messages within the duplicate window', () => {
    const res1 = checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Welcome to our service!');
    expect(res1.allowed).toBe(true);

    // Exact same content sent again
    const res2 = checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Welcome to our service!');
    expect(res2.allowed).toBe(false);
    expect(res2.reason).toBe('duplicate_message_suppressed');
  });

  it('suppresses messages when burst limit is exceeded', () => {
    // Send 3 distinct messages (up to burst limit)
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 1').allowed).toBe(true);
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 2').allowed).toBe(true);
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 3').allowed).toBe(true);

    // 4th message in same burst window should be blocked
    const res4 = checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 4');
    expect(res4.allowed).toBe(false);
    expect(res4.reason).toBe('burst_rate_exceeded');
  });

  it('isolates different contacts and different accounts', () => {
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 1').allowed).toBe(true);
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 2').allowed).toBe(true);
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-1', 'Message 3').allowed).toBe(true);

    // contact-2 should be allowed even if contact-1 is at burst limit
    expect(checkAndRecordAutomatedSend('acc-1', 'contact-2', 'Message 1').allowed).toBe(true);
    // acc-2 contact-1 should be allowed
    expect(checkAndRecordAutomatedSend('acc-2', 'contact-1', 'Message 1').allowed).toBe(true);
  });
});
