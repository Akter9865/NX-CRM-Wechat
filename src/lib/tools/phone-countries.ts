export interface CountryCode {
  name: string;
  code: string;
  dial: string;
  flag: string;
  format: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: 'India', code: 'IN', dial: '91', flag: '🇮🇳', format: '98765 43210' },
  { name: 'United States', code: 'US', dial: '1', flag: '🇺🇸', format: '(555) 123-4567' },
  { name: 'United Kingdom', code: 'GB', dial: '44', flag: '🇬🇧', format: '7911 123456' },
  { name: 'United Arab Emirates', code: 'AE', dial: '971', flag: '🇦🇪', format: '50 123 4567' },
  { name: 'Saudi Arabia', code: 'SA', dial: '966', flag: '🇸🇦', format: '50 123 4567' },
  { name: 'Singapore', code: 'SG', dial: '65', flag: '🇸🇬', format: '8123 4567' },
  { name: 'Malaysia', code: 'MY', dial: '60', flag: '🇲🇾', format: '12-345 6789' },
  { name: 'Indonesia', code: 'ID', dial: '62', flag: '🇮🇩', format: '812-3456-7890' },
  { name: 'Bangladesh', code: 'BD', dial: '880', flag: '🇧🇩', format: '1712-345678' },
  { name: 'Pakistan', code: 'PK', dial: '92', flag: '🇵🇰', format: '300 1234567' },
  { name: 'Australia', code: 'AU', dial: '61', flag: '🇦🇺', format: '412 345 678' },
  { name: 'Canada', code: 'CA', dial: '1', flag: '🇨🇦', format: '(555) 123-4567' },
  { name: 'Germany', code: 'DE', dial: '49', flag: '🇩🇪', format: '151 12345678' },
  { name: 'France', code: 'FR', dial: '33', flag: '🇫🇷', format: '6 12 34 56 78' },
  { name: 'Brazil', code: 'BR', dial: '55', flag: '🇧🇷', format: '11 91234-5678' },
  { name: 'Mexico', code: 'MX', dial: '52', flag: '🇲🇽', format: '1 55 1234 5678' },
  { name: 'South Africa', code: 'ZA', dial: '27', flag: '🇿🇦', format: '82 123 4567' },
  { name: 'Nigeria', code: 'NG', dial: '234', flag: '🇳🇬', format: '802 123 4567' },
  { name: 'Kenya', code: 'KE', dial: '254', flag: '🇰🇪', format: '712 345678' },
  { name: 'Egypt', code: 'EG', dial: '20', flag: '🇪🇬', format: '10 1234 5678' },
  { name: 'Philippines', code: 'PH', dial: '63', flag: '🇵🇭', format: '917 123 4567' },
  { name: 'Vietnam', code: 'VN', dial: '84', flag: '🇻🇳', format: '91 234 5678' },
  { name: 'Thailand', code: 'TH', dial: '66', flag: '🇹🇭', format: '81 234 5678' },
  { name: 'Spain', code: 'ES', dial: '34', flag: '🇪🇸', format: '612 34 56 78' },
  { name: 'Italy', code: 'IT', dial: '39', flag: '🇮🇹', format: '312 345 6789' },
  { name: 'Netherlands', code: 'NL', dial: '31', flag: '🇳🇱', format: '6 12345678' },
  { name: 'Turkey', code: 'TR', dial: '90', flag: '🇹🇷', format: '532 123 4567' },
  { name: 'Sri Lanka', code: 'LK', dial: '94', flag: '🇱🇰', format: '77 123 4567' },
  { name: 'Nepal', code: 'NP', dial: '977', flag: '🇳🇵', format: '984 1234567' },
  { name: 'China', code: 'CN', dial: '86', flag: '🇨🇳', format: '138 0013 8000' },
  { name: 'Japan', code: 'JP', dial: '81', flag: '🇯🇵', format: '90 1234 5678' },
  { name: 'South Korea', code: 'KR', dial: '82', flag: '🇰🇷', format: '10 1234 5678' },
];

/**
 * Cleans and converts a phone number into international E.164 without leading + or symbols.
 */
export function formatToInternationalPhone(rawNumber: string, dialCode: string): string {
  // Strip all non-digit characters
  let digits = rawNumber.replace(/\D/g, '');

  if (!digits) return '';

  const cleanDial = dialCode.replace(/\D/g, '');

  // Strip leading international double zero (e.g. 0091)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Strip leading single zero (e.g. 09876543210 -> 9876543210)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If already starts with the dial code, keep it
  if (digits.startsWith(cleanDial)) {
    return digits;
  }

  return `${cleanDial}${digits}`;
}

/**
 * Builds the official WhatsApp click-to-chat URL.
 */
export function buildWhatsAppLink(internationalNumber: string, message?: string): string {
  const cleanNumber = internationalNumber.replace(/\D/g, '');
  if (!cleanNumber) return '';

  if (!message || message.trim().length === 0) {
    return `https://wa.me/${cleanNumber}`;
  }

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message.trim())}`;
}
