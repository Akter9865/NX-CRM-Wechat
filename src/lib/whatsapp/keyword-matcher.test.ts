import { describe, expect, it } from 'vitest'
import { matchesKeyword, normalizePunctuation, normalizeWhitespace, parseKeywords } from './keyword-matcher'

describe('keyword-matcher', () => {
  it('parses keywords correctly from arrays and strings', () => {
    expect(parseKeywords(['  hi ', 'hello', ''])).toEqual(['hi', 'hello'])
    expect(parseKeywords('hi, hello,  pricing ')).toEqual(['hi', 'hello', 'pricing'])
    expect(parseKeywords(null)).toEqual([])
  })

  it('matches exact keywords (case-insensitive)', () => {
    expect(matchesKeyword('Hi', { keywords: ['hi'], matchType: 'exact' })).toBe(true)
    expect(matchesKeyword('HI', { keywords: ['hi'], matchType: 'exact' })).toBe(true)
    expect(matchesKeyword('Hi!', { keywords: ['hi'], matchType: 'exact' })).toBe(true)
    expect(matchesKeyword('hi there', { keywords: ['hi'], matchType: 'exact' })).toBe(false)
  })

  it('matches contains keywords', () => {
    expect(matchesKeyword('hello there friend', { keywords: ['there'], matchType: 'contains' })).toBe(true)
    expect(matchesKeyword('I want pricing info', { keywords: ['pricing'], matchType: 'contains' })).toBe(true)
    expect(matchesKeyword('random message', { keywords: ['pricing', 'help'], matchType: 'contains' })).toBe(false)
  })

  it('matches whole words', () => {
    expect(matchesKeyword('hi bhaiya how are you', { keywords: ['hi bhaiya'], matchType: 'word' })).toBe(true)
    expect(matchesKeyword('hi!', { keywords: ['hi'], matchType: 'word' })).toBe(true)
    expect(matchesKeyword('this is high level', { keywords: ['hi'], matchType: 'word' })).toBe(false)
  })

  it('matches starts_with', () => {
    expect(matchesKeyword('pricing details please', { keywords: ['pricing'], matchType: 'starts_with' })).toBe(true)
    expect(matchesKeyword('can I get pricing?', { keywords: ['pricing'], matchType: 'starts_with' })).toBe(false)
  })

  it('handles case-sensitive matching when enabled', () => {
    expect(matchesKeyword('HELLO', { keywords: ['hello'], caseSensitive: true, matchType: 'exact' })).toBe(false)
    expect(matchesKeyword('hello', { keywords: ['hello'], caseSensitive: true, matchType: 'exact' })).toBe(true)
  })

  it('handles Bengali / Bangla (বাংলা) Unicode keywords', () => {
    expect(matchesKeyword('হ্যালো কেমন আছেন?', { keywords: ['হ্যালো'], matchType: 'contains' })).toBe(true)
    expect(matchesKeyword('দাম কত', { keywords: ['দাম কত'], matchType: 'exact' })).toBe(true)
    expect(matchesKeyword('দাম কত ভাইয়া?', { keywords: ['দাম কত'], matchType: 'contains' })).toBe(true)
    expect(matchesKeyword('অন্য কথা', { keywords: ['দাম কত'], matchType: 'contains' })).toBe(false)
  })

  it('handles punctuation and whitespace gracefully', () => {
    expect(matchesKeyword('   hi,   hello!   ', { keywords: ['hello'], matchType: 'contains' })).toBe(true)
    expect(matchesKeyword('Start???', { keywords: ['start'], matchType: 'exact' })).toBe(true)
  })
})
