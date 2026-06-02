import { describe, expect, it } from 'vitest'

import {
  AI_REQUEST_OPTIONS,
  AI_REQUEST_TIMEOUT_MS,
  AiResponseError,
  isAiRequestError,
} from './timeout.js'

describe('AI timeout configuration', () => {
  it('definiert ein festes Timeout ohne automatische Retries', () => {
    expect(AI_REQUEST_TIMEOUT_MS).toBe(17000)
    expect(AI_REQUEST_OPTIONS).toEqual({
      timeout: 17000,
      maxRetries: 0,
    })
  })
})

describe('AiResponseError', () => {
  it('setzt einen eindeutigen Fehlernamen', () => {
    const error = new AiResponseError('Keine strukturierte KI-Antwort erhalten.')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AiResponseError')
    expect(error.message).toBe('Keine strukturierte KI-Antwort erhalten.')
  })
})

describe('isAiRequestError', () => {
  it('erkennt eigene KI-Antwortfehler', () => {
    expect(isAiRequestError(new AiResponseError('invalid response'))).toBe(true)
  })

  it('lehnt normale Programmierfehler ab', () => {
    expect(isAiRequestError(new Error('boom'))).toBe(false)
  })

  it('lehnt unbekannte Werte ab', () => {
    expect(isAiRequestError('timeout')).toBe(false)
    expect(isAiRequestError(null)).toBe(false)
  })
})
