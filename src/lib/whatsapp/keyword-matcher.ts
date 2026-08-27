/**
 * Production-ready Keyword Matcher for WhatsApp Automations and Flows.
 *
 * Supports:
 * - Exact match ('exact')
 * - Contains substring match ('contains')
 * - Whole word boundary match ('word')
 * - Starts-with match ('starts_with')
 * - Case-insensitive & Case-sensitive options
 * - Whitespace normalization (collapsing extra spaces, tabs, newlines)
 * - Punctuation normalization (cleaning leading/trailing punctuations like !?,.;: so "Hi!" matches "hi")
 * - Full Unicode support including English, Bangla / Bengali (বাংলা), Hindi, Arabic, etc.
 * - Array of keywords or comma-separated string
 */

export interface KeywordMatcherOptions {
  keywords?: string[] | string | null
  matchType?: 'exact' | 'contains' | 'word' | 'starts_with'
  caseSensitive?: boolean
}

/**
 * Normalizes text by collapsing whitespace and trimming.
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Normalizes punctuation around words so messages like "Hi!" or "Hello, there"
 * can match "hi" or "hello" gracefully without breaking Unicode words.
 */
export function normalizePunctuation(text: string): string {
  if (!text) return ''
  // Replace common decorative and sentence punctuations with space, while preserving alphanumeric & unicode letters/numbers
  return text
    .replace(/[!?,;:\-_—~`'"#@$%^&*()+=\[\]{}|\/\\<>।॥]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses raw keywords config (array or comma-separated string) into a clean list of non-empty keywords.
 */
export function parseKeywords(rawKeywords?: string[] | string | null): string[] {
  if (!rawKeywords) return []
  if (Array.isArray(rawKeywords)) {
    return rawKeywords
      .map((k) => (typeof k === 'string' ? normalizeWhitespace(k) : ''))
      .filter((k) => k.length > 0)
  }
  if (typeof rawKeywords === 'string') {
    return rawKeywords
      .split(',')
      .map((k) => normalizeWhitespace(k))
      .filter((k) => k.length > 0)
  }
  return []
}

/**
 * Matches inbound text against configured keywords.
 */
export function matchesKeyword(
  inboundText: string | null | undefined,
  options: KeywordMatcherOptions
): boolean {
  if (!inboundText) return false

  const keywords = parseKeywords(options.keywords)
  if (keywords.length === 0) return false

  const matchType = options.matchType || 'contains'
  const caseSensitive = Boolean(options.caseSensitive)

  const cleanInbound = normalizeWhitespace(inboundText)
  if (!cleanInbound) return false

  const inboundPunctClean = normalizePunctuation(cleanInbound)

  const targetHaystack = caseSensitive ? cleanInbound : cleanInbound.toLowerCase()
  const punctHaystack = caseSensitive ? inboundPunctClean : inboundPunctClean.toLowerCase()

  for (const rawKw of keywords) {
    const cleanKw = normalizeWhitespace(rawKw)
    if (!cleanKw) continue

    const needle = caseSensitive ? cleanKw : cleanKw.toLowerCase()
    const punctNeedle = caseSensitive
      ? normalizePunctuation(cleanKw)
      : normalizePunctuation(cleanKw).toLowerCase()

    if (matchType === 'exact') {
      // Check both exact clean string and punctuation-stripped exact
      if (targetHaystack === needle || punctHaystack === punctNeedle) {
        return true
      }
      continue
    }

    if (matchType === 'starts_with') {
      if (
        targetHaystack.startsWith(needle) ||
        (punctNeedle && punctHaystack.startsWith(punctNeedle))
      ) {
        return true
      }
      continue
    }

    if (matchType === 'word') {
      // Whole-word matching with Unicode word boundaries
      try {
        const escaped = escapeRegExp(needle)
        const regex = new RegExp(`(?:^|[\\s\\p{P}])${escaped}(?:$|[\\s\\p{P}])`, caseSensitive ? 'u' : 'iu')
        if (regex.test(cleanInbound)) return true
      } catch {
        // Fallback to token comparison on punctHaystack
        const tokens = punctHaystack.split(' ').filter(Boolean)
        if (tokens.includes(punctNeedle || needle)) return true
      }
      continue
    }

    // Default: 'contains'
    if (
      targetHaystack.includes(needle) ||
      (punctNeedle && punctHaystack.includes(punctNeedle))
    ) {
      return true
    }
  }

  return false
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
