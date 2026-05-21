import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../ai/llmAdapter.js'
import { AiResponseError } from '../ai/timeout.js'
import { buildApp } from '../app.js'
import type { AssessmentPayload } from '../modules/assessment/assessment.types.js'

vi.mock('../ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

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

  it('bewertet ein gueltiges Assessment ueber die HTTP-Route', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
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
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })
    expect(Date.parse(body.createdAt)).not.toBeNaN()
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'assessment_result',
        temperature: 0,
      }),
    )
  })

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
      message: 'Validation failed',
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('liefert den kontrollierten Assessment-Fallback bei KI-Ausfall', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const response = await app.inject({
      method: 'POST',
      url: '/assessments',
      payload: createPayload(),
    })

    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body).toMatchObject({
      careLevel: 'doctor',
      summary:
        'Bitte lassen Sie die angegebenen Beschwerden zeitnah medizinisch abklaeren. Bei ploetzlicher Verschlechterung oder akuter Gefahr waehlen Sie den Notruf.',
    })
    expect(body.reasons[0]).toContain('Kopf (links)')
    expect(Date.parse(body.createdAt)).not.toBeNaN()
  })
})
