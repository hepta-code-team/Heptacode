import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiResponseError } from '../../ai/timeout.js'
import { requestStructuredAiResponseWithModel } from '../../ai/llmAdapter.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import { evaluateTriage } from './triage.service.js'

vi.mock('../../ai/llmAdapter.js', () => ({
  requestStructuredAiResponseWithModel: vi.fn(),
}))

vi.mock('../symptom-extraction/symptomExtraction.service.js', () => ({
  extractSymptoms: vi.fn(),
}))

const requestStructuredAiResponseWithModelMock = vi.mocked(requestStructuredAiResponseWithModel)
const extractSymptomsMock = vi.mocked(extractSymptoms)

describe('evaluateTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt bei Notfallauswahl direkt emergency zurueck', async () => {
    const result = await evaluateTriage(undefined, [], true)

    expect(result).toMatchObject({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('gibt ohne Symptome selfcare zurueck und ruft keine KI auf', async () => {
    const result = await evaluateTriage(undefined, undefined)

    expect(result).toMatchObject({
      careLevel: 'selfcare',
      reasons: [],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('uebernimmt eine gueltige KI-Triage mit Fachrichtung', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'specialist',
        recommendedSpecialty: 'neurology',
        reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: neurology.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Kopf', measurementType: 'pain', measurementValue: 7, duration: 'days' },
    ])

    expect(result).toEqual({
      careLevel: 'specialist',
      recommendedSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklaeren.',
        professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: neurology.',
      },
      aiModel: 'test-model',
    })
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'triage_result',
      }),
    )
  })

  it('nutzt den Fallback, wenn die KI-Anfrage fehlschlaegt', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Brust', measurementType: 'pain', measurementValue: 8, duration: 'today' },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      aiUnavailable: true,
    })
    expect(result.reasons).toHaveLength(2)
  })

  it('nutzt den Doctor-Fallback bei mittleren Beschwerden', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'days' },
    ])

    expect(result).toMatchObject({
      careLevel: 'doctor',
      aiUnavailable: true,
    })
  })

  it('wandelt ungueltigen Freitext in einen Bad-Request-Fehler um', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Hallo',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: 'Bitte beschreiben Sie konkrete Beschwerden.',
    })

    await expect(
      evaluateTriage(undefined, undefined, false, 'Hallo'),
    ).rejects.toMatchObject({
      message: 'Bitte beschreiben Sie konkrete Beschwerden.',
      statusCode: 400,
    })
  })

  it('nutzt den Freitext-Fallback, wenn die Symptom-Extraktion nicht verfuegbar ist', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich habe starke Schmerzen.',
      inputType: 'text',
      symptoms: [],
      aiUnavailable: true,
    })

    const result = await evaluateTriage(
      undefined,
      undefined,
      false,
      'Ich habe starke Schmerzen.',
    )

    expect(result).toMatchObject({
      careLevel: 'doctor',
      aiUnavailable: true,
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  it('verwendet extrahierte Symptome fuer die KI-Triage', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich habe seit Tagen Husten.',
      inputType: 'speech',
      symptoms: [{ region: 'Allgemein', measurementType: 'pain', measurementValue: 4, duration: 'days' }],
    })
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(
      undefined,
      undefined,
      false,
      'Ich habe seit Tagen Husten.',
      'speech',
    )

    expect(result).toEqual({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      aiModel: 'test-model',
    })
    expect(extractSymptomsMock).toHaveBeenCalledWith('Ich habe seit Tagen Husten.', 'speech')
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
  })
})
