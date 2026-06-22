import { describe, expect, it } from 'vitest'

import {
  AI_REQUEST_OPTIONS,
  AI_REQUEST_TIMEOUT_MS,
  AiResponseError,
  createAiRequestOptions,
  isAiRequestError,
} from '../../../src/ai/timeout.js'

describe('AI timeout configuration', () => {
  /** Timeout options should stay explicit and avoid SDK-level retry amplification. */
  it('definiert getrennte Timeouts ohne automatische Retries', () => {
    expect(AI_REQUEST_TIMEOUT_MS).toEqual({
      primary: 40_000,
      fallback: 22_000,
    })
    expect(AI_REQUEST_OPTIONS).toEqual({
      timeout: 40_000,
      maxRetries: 0,
    })
    expect(createAiRequestOptions(AI_REQUEST_TIMEOUT_MS.fallback)).toEqual({
      timeout: 22_000,
      maxRetries: 0,
    })
  })
})

describe('AiResponseError', () => {
  /** AI response errors should be distinguishable from generic runtime errors. */
  it('setzt einen eindeutigen Fehlernamen', () => {
    const error = new AiResponseError('Keine strukturierte KI-Antwort erhalten.')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AiResponseError')
    expect(error.message).toBe('Keine strukturierte KI-Antwort erhalten.')
  })
})

describe('isAiRequestError', () => {
  /** Domain AI response errors should be classified as AI request failures. */
  it('erkennt eigene KI-Antwortfehler', () => {
    expect(isAiRequestError(new AiResponseError('invalid response'))).toBe(true)
  })

  /** Generic programming errors should not be handled as AI request failures. */
  it('lehnt normale Programmierfehler ab', () => {
    expect(isAiRequestError(new Error('boom'))).toBe(false)
  })

  /** Non-error values should not enter AI request fallback handling. */
  it('lehnt unbekannte Werte ab', () => {
    expect(isAiRequestError('timeout')).toBe(false)
    expect(isAiRequestError(null)).toBe(false)
  })
})
