import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError } from 'openai'

// TA 1.8: KI-Requests duerfen nicht unbegrenzt haengen.
export const AI_REQUEST_TIMEOUT_MS = 17000

// Ohne Retries greift der definierte Fallback schnell und vorhersehbar.
export const AI_REQUEST_OPTIONS = {
  timeout: AI_REQUEST_TIMEOUT_MS,
  maxRetries: 0,
} as const

// Wird genutzt, wenn die KI antwortet, aber keine validierbare strukturierte Ausgabe liefert.
export class AiResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiResponseError'
  }
}

// Diese Fehler duerfen von den Services in kontrollierte Fallback-Antworten umgewandelt werden.
export function isAiRequestError(error: unknown): boolean {
  return (
    error instanceof AiResponseError ||
    error instanceof OpenAI.APIError ||
    error instanceof APIError ||
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError
  )
}

// Diese Fehler bedeuten, dass das angefragte Modell bzw. der AI-Dienst nicht
// erreichbar ist oder nicht rechtzeitig antwortet. In diesen Faellen wird das
// kleinere Fallback-Modell versucht.
export function isAiAvailabilityError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError ||
    error instanceof APIError ||
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError
  )
}
