import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError } from 'openai'

// AI requests must not block the assessment flow indefinitely.
export const AI_REQUEST_TIMEOUT_MS = 17000

// Disable retries so the defined fallback runs quickly and predictably.
export const AI_REQUEST_OPTIONS = {
  timeout: AI_REQUEST_TIMEOUT_MS,
  maxRetries: 0,
} as const

// Raised when the AI responds without valid structured output.
export class AiResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiResponseError'
  }
}

// Services may convert these failures into controlled fallback responses.
export function isAiRequestError(error: unknown): boolean {
  return (
    error instanceof AiResponseError ||
    error instanceof OpenAI.APIError ||
    error instanceof APIError ||
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError
  )
}

// These failures indicate that the requested model or AI service is unavailable,
// so the smaller fallback model should be attempted.
export function isAiAvailabilityError(error: unknown): boolean {
  if (error instanceof APIConnectionError || error instanceof APIConnectionTimeoutError) {
    return true
  } 

  if (error instanceof OpenAI.APIError || error instanceof APIError) {
    return error.status === 429 || (typeof error.status === 'number' && error.status >= 500)
  }
  return false
}
