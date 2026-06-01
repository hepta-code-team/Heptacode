import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiResponseError } from '../ai/timeout.js'
import { requestStructuredAiResponse } from '../ai/llmAdapter.js'
import { extractSymptoms } from '../modules/symptom-extraction/symptomExtraction.service.js'
import { evaluateTriage } from '../modules/triage/triage.service.js'

vi.mock('../ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

vi.mock('../modules/symptom-extraction/symptomExtraction.service.js', () => ({
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

    expect(result).toMatchObject({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('gibt ohne Symptome selfcare zurueck und ruft keine KI auf', async () => {
    const result = await evaluateTriage(undefined, undefined)

    expect(result).toMatchObject({
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
      { region: 'Kopf', measurementType: 'pain', measurementValue: 7, duration: 'days' },
    ])

    expect(result).toEqual({
      careLevel: 'specialist',
      medicalSpecialty: 'neurology',
      recommendedSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
  })

  it('nutzt den Fallback, wenn die KI-Anfrage fehlschlaegt', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

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
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

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
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('verwendet extrahierte Symptome fuer die KI-Triage', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich habe seit Tagen Husten.',
      inputType: 'speech',
      symptoms: [{ region: 'Brust', measurementType: 'pain', measurementValue: 4, duration: 'days' }],
    })
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      medicalSpecialty: null,
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
    })

    const result = await evaluateTriage(
      undefined,
      undefined,
      false,
      'Ich habe seit Tagen Husten.',
      'speech',
    )

    expect(result).toEqual({
      careLevel: 'specialist',
      medicalSpecialty: null,
      recommendedSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
    })
    expect(extractSymptomsMock).toHaveBeenCalledWith('Ich habe seit Tagen Husten.', 'speech')
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
  })
})
