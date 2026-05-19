import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiResponseError } from '../../ai/timeout.js'
import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import { evaluateTriage } from './triage.service.js'

vi.mock('../../ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

vi.mock('../symptom-extraction/symptomExtraction.service.js', () => ({
  extractSymptoms: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)
const extractSymptomsMock = vi.mocked(extractSymptoms)

describe('evaluateTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt bei Notfallauswahl direkt emergency zurueck', async () => {
    const result = await evaluateTriage(undefined, [], true)

    expect(result).toEqual({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('gibt ohne Symptome selfcare zurueck und ruft keine KI auf', async () => {
    const result = await evaluateTriage(undefined, undefined)

    expect(result).toEqual({
      careLevel: 'selfcare',
      reasons: [],
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('uebernimmt eine gueltige KI-Triage mit Fachrichtung', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'specialist',
      medicalSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Kopf', painLevel: 7, duration: 'days' },
    ])

    expect(result).toEqual({
      careLevel: 'specialist',
      recommendedSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
  })

  it('nutzt den Fallback, wenn die KI-Anfrage fehlschlaegt', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Brust', painLevel: 8, duration: 'today' },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      aiUnavailable: true,
    })
    expect(result.reasons).toHaveLength(2)
  })
})
