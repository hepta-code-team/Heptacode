import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponseWithModel } from '../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../src/ai/timeout.js'
import { buildApp } from '../../../src/app.js'
import type { AssessmentPayload } from '../../../src/modules/assessment/assessment.types.js'

vi.mock('../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponseWithModel: vi.fn(),
}))

const requestStructuredAiResponseWithModelMock = vi.mocked(requestStructuredAiResponseWithModel)

/** Creates an isolated Fastify instance for each route test. */
async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

/** Complete assessment fixture aligned with the frontend submission contract. */
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
      medicationDuration: '',
      substanceInfluence: '',
      recentAbroad: '',
      recentAbroadDetails: '',
      conditions: ['Asthma'],
      isSmoker: '',
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

describe('POST /assessments', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  /** Valid assessment input should return the frontend-facing triage result shape. */
  it('bewertet ein gueltiges Assessment ueber die HTTP-Route', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/assessments',
      payload: createPayload(),
    })

    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      reasons: ['Die Beschwerden sollten ärztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklären.',
    })
    expect(Date.parse(body.createdAt)).not.toBeNaN()
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'triage_result',
        temperature: 0,
      }),
    )
  })

  /** Invalid assessment input should stop before model execution. */
  it('antwortet mit 400 bei ungueltigem Assessment-Payload', async () => {
    const payload = createPayload()

    const response = await app.inject({
      method: 'POST',
      url: '/assessments',
      payload: {
        ...payload,
        symptomDetails: [],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is invalid',
      },
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  /** AI availability errors should preserve a controlled assessment response. */
  it('liefert den kontrollierten Assessment-Fallback bei KI-Ausfall', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const response = await app.inject({
      method: 'POST',
      url: '/assessments',
      payload: createPayload(),
    })

    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      aiUnavailable: true,
    })
    expect(body.reasons[0]).toContain('KI-Auswertung')
    expect(Date.parse(body.createdAt)).not.toBeNaN()
  })
})