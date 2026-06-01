import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../ai/llmAdapter.js'
import { AiResponseError } from '../ai/timeout.js'
import { evaluateAssessmentWithAi } from '../modules/assessment/assessment.service.js'
import type { AssessmentPayload } from '../modules/assessment/assessment.types.js'

vi.mock('../ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

function createPayload(): AssessmentPayload {
  return {
    patientData: {
      birthMonth: '01',
      birthYear: '1990',
      height: '170',
      weight: '70',
      gender: 'female',
      isPregnant: false,
      isBreastfeeding: false,
      allergies: '',
      medications: '',
      substanceInfluence: '',
      recentAbroad: false,
      recentAbroadDetails: '',
      conditions: ['Asthma'],
      isSmoker: false,
      smokingSinceYears: '',
      cigarettesPerDay: '',
      conditionDetails: {},
    },
    selectedSymptoms: [{ region: 'Kopf', side: 'links' }],
    symptomDetails: [
      {
        id: 'symptom-1',
        region: 'Kopf',
        side: 'links',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'days',
        active: true,
      },
    ],
  }
}

describe('evaluateAssessmentWithAi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt ein gueltiges KI-Ergebnis mit createdAt zurueck', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'specialist',
      recommendedSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary:
        'Ihre Angaben wurden strukturiert ausgewertet. Bitte orientieren Sie sich an der empfohlenen Versorgungsebene und suchen Sie bei Verschlechterung medizinische Hilfe.',
    })
    expect(Date.parse(result.createdAt)).not.toBeNaN()
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'triage_result',
        temperature: 0,
      }),
    )
  })

  it('uebergibt formatierte Patientendaten und Symptomdetails an die KI', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })

    await evaluateAssessmentWithAi(createPayload())

    const request = requestStructuredAiResponseMock.mock.calls[0]?.[0]
    const userMessage = request?.messages.find((message) => message.role === 'user')

    expect(userMessage?.content).toContain('Geburtsjahr: 1990')
    expect(userMessage?.content).toContain('Kopf (links)')
    expect(userMessage?.content).toContain('Schmerzstaerke 7/10')
    expect(userMessage?.content).toContain('Seit ein paar Tagen')
  })

  it('nutzt den Beispiel-Fallback bei bekannten KI-Fehlern', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'doctor',
      summary:
        'Ihre Angaben wurden strukturiert ausgewertet. Bitte orientieren Sie sich an der empfohlenen Versorgungsebene und suchen Sie bei Verschlechterung medizinische Hilfe.',
    })
    expect(result.aiUnavailable).toBe(true)
    expect(Date.parse(result.createdAt)).not.toBeNaN()
  })

  it('reicht unerwartete Fehler weiter', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new Error('boom'))

    await expect(evaluateAssessmentWithAi(createPayload())).rejects.toThrow('boom')
  })
})
