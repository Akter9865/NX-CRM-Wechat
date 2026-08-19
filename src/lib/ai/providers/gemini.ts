import { AiError, type ChatMessage, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

interface GeminiCandidate {
  content?: {
    parts?: { text?: string }[]
    role?: string
  }
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

/**
 * Gemini's API expects roles to alternate and start with 'user'.
 * Assistant turns map to 'model'.
 */
function normalizeForGemini(messages: ChatMessage[]): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const merged = mergeConsecutive(messages)
  while (merged.length > 0 && merged[0].role === 'assistant') {
    merged.shift()
  }
  if (merged.length === 0) {
    return [{ role: 'user', parts: [{ text: '(The customer has not sent a message yet.)' }] }]
  }

  return merged.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

/**
 * Call Google Gemini generateContent endpoint with the caller's own key.
 * Supports gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, etc.
 */
export async function generateGemini(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args

  // Clean model identifier (e.g. if user entered "models/gemini-1.5-flash", strip "models/")
  const cleanModel = model.replace(/^models\//, '').trim()
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`

  const body: Record<string, unknown> = {
    contents: normalizeForGemini(messages),
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  }

  if (systemPrompt && systemPrompt.trim()) {
    body.system_instruction = {
      parts: [{ text: systemPrompt.trim() }],
    }
  }

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Google Gemini', res)
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  if (data?.error) {
    throw new AiError(data.error.message ?? 'Gemini API returned an error.', {
      code: data.error.status ?? 'gemini_error',
      status: data.error.code ?? 400,
    })
  }

  const candidate = data?.candidates?.[0]
  const text = candidate?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new AiError('Google Gemini returned an empty response.', {
      code: 'empty_response',
    })
  }

  const usage = normalizeUsage({
    prompt: data?.usageMetadata?.promptTokenCount,
    completion: data?.usageMetadata?.candidatesTokenCount,
    total: data?.usageMetadata?.totalTokenCount,
  })

  return { text, usage }
}
