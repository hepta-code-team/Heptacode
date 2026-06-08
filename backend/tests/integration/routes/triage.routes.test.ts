import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse, requestStructuredAiResponseWithModel } from '../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../src/ai/timeout.js'
import { buildApp } from '../../../src/app.js'

vi.mock('../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
  requestStructuredAiResponseWithModel: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)
const requestStructuredAiResponseWithModelMock = vi.mocked(requestStructuredAiResponseWithModel)

const malePatientData = {
  birthMonth: '05',
  birthYear: '1988',
  height: '175',
  weight: '78',
  gender: 'Maennlich',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  substanceInfluence: 'Nein',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

describe('POST /api/v1/triage/evaluate', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('bewertet strukturierte Symptome ueber die Triage-Pipeline', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: cardiology.',
        },
      },
      model: 'test-model',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        symptoms: [{ region: 'Brust', measurementType: 'pain', measurementValue: 7, duration: 'today' }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      careLevel: 'specialist',
      recommendedSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
      recommendedSpecialties: [
        {
          specialty: 'cardiology',
          label: 'Kardiologie',
          reason: 'Die Beschwerden sollten kardiologisch abgeklaert werden.',
          priority: 1,
        },
      ],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
        professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: cardiology.',
      },
      aiModel: 'test-model',
    })
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'triage_result',
        temperature: 0,
      }),
    )
  })

  it('verbindet Freitext-Extraktion und anschliessende Triage', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
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

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        text: 'Ich habe seit Tagen Kopfschmerzen.',
        inputType: 'speech',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
      recommendedSpecialties: [
        {
          specialty: 'neurology',
          label: 'Neurologie',
          reason: 'Die Beschwerden sollten aerztlich abgeklart werden.',
          priority: 1,
        },
      ],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      aiModel: 'test-model',
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
  })

  it('liefert den Notfallmodus ohne KI-Aufruf direkt zurueck', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        emergencyFromLanding: true,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  it('antwortet mit 400 bei ungueltigem Request-Body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is invalid',
      },
    })
  })

  it('antwortet mit 400 bei logisch widerspruechlichen Schwangerschaftsangaben', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        patientData: malePatientData,
        text: 'Ich waere schwanger und habe Wehen.',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: expect.stringContaining('passen logisch nicht zusammen'),
      },
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  it('nutzt den kontrollierten Fallback, wenn die Triage-KI nicht antwortet', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        symptoms: [{ region: 'Brust', measurementType: 'pain', measurementValue: 9, duration: 'today' }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      careLevel: 'emergency',
      aiUnavailable: true,
    })
  })
})
