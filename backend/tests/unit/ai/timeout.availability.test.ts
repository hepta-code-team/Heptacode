import { describe, expect, it } from 'vitest'
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from 'openai'

import { isAiAvailabilityError, isAiRequestError } from '../../../src/ai/timeout.js'

describe('AI availability error detection', () => {
  it('erkennt Verbindungsfehler als AI-Request- und Availability-Fehler', () => {
    const error = new APIConnectionError({ message: 'connection failed' })

    expect(isAiRequestError(error)).toBe(true)
    expect(isAiAvailabilityError(error)).toBe(true)
  })

  it('erkennt Timeout-Fehler als AI-Request- und Availability-Fehler', () => {
    const error = new APIConnectionTimeoutError({ message: 'timeout' })

    expect(isAiRequestError(error)).toBe(true)
    expect(isAiAvailabilityError(error)).toBe(true)
  })

  it('erkennt Rate-Limits und Serverfehler als Availability-Fehler', () => {
    const headers = new Headers()
    const rateLimitError = APIError.generate(429, { error: { message: 'rate limited' } }, undefined, headers)
    const serverError = APIError.generate(503, { error: { message: 'unavailable' } }, undefined, headers)

    expect(isAiAvailabilityError(rateLimitError)).toBe(true)
    expect(isAiAvailabilityError(serverError)).toBe(true)
  })

  it('lehnt Clientfehler und unbekannte Fehler als Availability-Fehler ab', () => {
    const headers = new Headers()
    const badRequestError = APIError.generate(400, { error: { message: 'bad request' } }, undefined, headers)

    expect(isAiAvailabilityError(badRequestError)).toBe(false)
    expect(isAiAvailabilityError(new Error('boom'))).toBe(false)
  })
})
