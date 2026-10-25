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
 * Supports gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, etc.
 */
export async function generateGemini(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args

  const cleanApiKey = apiKey.trim().replace(/^['"]|['"]$/g, '')
  // Clean model identifier (e.g. if user entered "models/gemini-2.0-flash", strip "models/")
  const initialModel = model.replace(/^models\//, '').trim() || 'gemini-2.0-flash'

  const bodyPayload: Record<string, unknown> = {
    contents: normalizeForGemini(messages),
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  }

  if (systemPrompt && systemPrompt.trim()) {
    bodyPayload.system_instruction = {
      parts: [{ text: systemPrompt.trim() }],
    }
  }

  const tryCallModel = async (targetModel: string): Promise<Response> => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(cleanApiKey)}`
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': cleanApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  }

  let res: Response
  try {
    res = await tryCallModel(initialModel)

    // If initial model returned 404 (not found) or 403 (access restricted for 2.5),
    // and it is not already gemini-2.0-flash or gemini-1.5-flash, automatically fallback!
    if (!res.ok && (res.status === 404 || res.status === 403) && initialModel !== 'gemini-2.0-flash') {
      console.warn(`[gemini] Model ${initialModel} returned ${res.status}. Falling back to gemini-2.0-flash...`)
      const fallbackRes = await tryCallModel('gemini-2.0-flash')
      if (fallbackRes.ok) {
        res = fallbackRes
      } else if (fallbackRes.status === 404) {
        const fallback15 = await tryCallModel('gemini-1.5-flash')
        if (fallback15.ok) {
          res = fallback15
        }
      }
    }
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
    if (candidate?.finishReason === 'SAFETY') {
      throw new AiError('Google Gemini response was blocked by safety filters.', {
        code: 'safety_blocked',
      })
    }
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
