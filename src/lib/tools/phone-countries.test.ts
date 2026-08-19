import { describe, it, expect } from 'vitest';
import {
  COUNTRY_CODES,
  formatToInternationalPhone,
  buildWhatsAppLink,
} from './phone-countries';

describe('WhatsApp Free Tools Helpers', () => {
  describe('formatToInternationalPhone', () => {
    it('formats a normal domestic number with dial code', () => {
      const formatted = formatToInternationalPhone('9876543210', '91');
      expect(formatted).toBe('919876543210');
    });

    it('strips leading zeros and non-digit characters', () => {
      const formatted = formatToInternationalPhone('098765-43210', '91');
      expect(formatted).toBe('919876543210');
    });

    it('handles numbers already containing the dial code', () => {
      const formatted = formatToInternationalPhone('+91 98765 43210', '91');
      expect(formatted).toBe('919876543210');
    });

    it('handles US numbers formatted with parentheses', () => {
      const formatted = formatToInternationalPhone('(555) 123-4567', '1');
      expect(formatted).toBe('15551234567');
    });

    it('returns empty string on blank or invalid inputs', () => {
      expect(formatToInternationalPhone('', '91')).toBe('');
      expect(formatToInternationalPhone('   ', '91')).toBe('');
    });
  });

  describe('buildWhatsAppLink', () => {
    it('builds a direct wa.me link without message', () => {
      const link = buildWhatsAppLink('919876543210');
      expect(link).toBe('https://wa.me/919876543210');
    });

    it('builds a direct wa.me link with URL-encoded message', () => {
      const link = buildWhatsAppLink('919876543210', 'Hello World! How are you?');
      expect(link).toBe('https://wa.me/919876543210?text=Hello%20World!%20How%20are%20you%3F');
    });

    it('handles special characters and emojis properly', () => {
      const link = buildWhatsAppLink('15551234567', '👋 Hi! Need pricing & details.');
      expect(link).toContain('https://wa.me/15551234567?text=');
      expect(decodeURIComponent(link.split('?text=')[1])).toBe('👋 Hi! Need pricing & details.');
    });

    it('returns empty string if number is missing', () => {
      expect(buildWhatsAppLink('')).toBe('');
    });
  });

  describe('Country codes registry', () => {
    it('includes major countries with dial codes and flags', () => {
      expect(COUNTRY_CODES.length).toBeGreaterThan(20);
      const india = COUNTRY_CODES.find((c) => c.code === 'IN');
      expect(india?.dial).toBe('91');
      expect(india?.flag).toBe('🇮🇳');

      const us = COUNTRY_CODES.find((c) => c.code === 'US');
      expect(us?.dial).toBe('1');
    });
  });
});
