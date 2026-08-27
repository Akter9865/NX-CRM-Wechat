import { describe, expect, it, vi } from 'vitest'
import { matchesKeyword, normalizePunctuation, normalizeWhitespace } from '@/lib/whatsapp/keyword-matcher'
import { validateFlowForActivation } from '@/lib/flows/validate'
import { interpolateFlowVariables } from '@/lib/flows/engine'

describe('End-to-End Automation & Flow Engine Test Suite', () => {
  // TEST 1: User sends "hi" -> Keyword match
  it('TEST 1: User sends "hi" and matches keyword trigger', () => {
    const matched = matchesKeyword('hi', {
      keywords: ['hi', 'hello', 'pricing'],
      matchType: 'contains',
      caseSensitive: false,
    })
    expect(matched).toBe(true)
  })

  // TEST 2: User sends "HI" -> Case-insensitive match
  it('TEST 2: User sends "HI" and matches case-insensitive trigger', () => {
    const matched = matchesKeyword('HI', {
      keywords: ['hi'],
      matchType: 'exact',
      caseSensitive: false,
    })
    expect(matched).toBe(true)
  })

  // TEST 3: User sends "hello there" -> Contains match
  it('TEST 3: User sends "hello there" and matches contains trigger', () => {
    const matched = matchesKeyword('hello there', {
      keywords: ['hello'],
      matchType: 'contains',
    })
    expect(matched).toBe(true)
  })

  // TEST 4: User sends unrelated message -> No match
  it('TEST 4: User sends unrelated message and does not trigger keyword', () => {
    const matched = matchesKeyword('what is the weather today?', {
      keywords: ['hi', 'pricing', 'help'],
      matchType: 'contains',
    })
    expect(matched).toBe(false)
  })

  // TEST 5: Variable interpolation for Contact & Vars
  it('TEST 5: Resolves {{contact.name}}, {{contact.phone}}, {{vars.x}} in messages', () => {
    const template = 'Hello {{contact.name}} ({{contact.phone}})! Your code is {{vars.code}}.'
    const result = interpolateFlowVariables(
      template,
      { code: '9876' },
      { name: 'John Doe', phone: '+1234567890' }
    )
    expect(result).toBe('Hello John Doe (+1234567890)! Your code is 9876.')
  })

  // TEST 6: Invalid Send Message node -> activation blocked
  it('TEST 6: Rejects activation for Send Message node with empty text body', () => {
    const issues = validateFlowForActivation(
      {
        name: 'Test Flow',
        trigger_type: 'keyword',
        trigger_config: { keywords: ['hi'] },
        entry_node_id: 'node_1',
      },
      [
        {
          node_key: 'node_1',
          node_type: 'send_message',
          config: { text: '' },
        },
      ]
    )
    expect(issues.some((i) => i.severity === 'error' && i.field === 'text')).toBe(true)
  })

  // TEST 7: Invalid Keyword Trigger -> activation blocked
  it('TEST 7: Rejects activation when keyword trigger has no keywords', () => {
    const issues = validateFlowForActivation(
      {
        name: 'Test Flow',
        trigger_type: 'keyword',
        trigger_config: { keywords: [] },
        entry_node_id: 'node_1',
      },
      [
        {
          node_key: 'node_1',
          node_type: 'send_message',
          config: { text: 'Hello!' },
        },
      ]
    )
    expect(issues.some((i) => i.severity === 'error' && i.scope === 'trigger')).toBe(true)
  })

  // TEST 8: Audio Send Media validation
  it('TEST 8: Accepts audio, image, video, and document in Send Media node', () => {
    for (const media_type of ['audio', 'image', 'video', 'document'] as const) {
      const issues = validateFlowForActivation(
        {
          name: 'Media Flow',
          trigger_type: 'keyword',
          trigger_config: { keywords: ['media'] },
          entry_node_id: 'start',
        },
        [
          {
            node_key: 'start',
            node_type: 'start',
            config: { next_node_key: 'media_1' },
          },
          {
            node_key: 'media_1',
            node_type: 'send_media',
            config: {
              media_type,
              media_url: 'https://example.com/file.mp3',
            },
          },
        ]
      )
      expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    }
  })

  // TEST 9: Multilingual / Bangla support
  it('TEST 9: Matches Bangla (বাংলা) Unicode keywords with punctuation', () => {
    expect(
      matchesKeyword('হ্যালো ভাইয়া! কেমন আছেন?', {
        keywords: ['হ্যালো ভাইয়া'],
        matchType: 'contains',
      })
    ).toBe(true)

    expect(
      matchesKeyword('দাম কত?', {
        keywords: ['দাম কত'],
        matchType: 'exact',
      })
    ).toBe(true)
  })
})
