import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../src/ai/timeout.js'
import { buildApp } from '../../../src/app.js'

vi.mock('../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

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
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      careLevel: 'specialist',
      medicalSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        symptoms: [
          { region: 'Brust', measurementType: 'pain', measurementValue: 7, duration: 'today' },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      careLevel: 'specialist',
      medicalSpecialty: 'cardiology',
      recommendedSpecialty: 'cardiology',
      reasons: ['Die Beschwerden sollten kardiologisch abgeklaert werden.'],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
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
        symptoms: [{ region: 'Kopf', painLevel: 6, duration: 'days' }],
      })
      .mockResolvedValueOnce({
        careLevel: 'doctor',
        medicalSpecialty: null,
        reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
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
      medicalSpecialty: null,
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(3)
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
  })

  it('antwortet mit 400 bei ungueltigem Request-Body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      message: 'Validation failed',
    })
  })

  it('nutzt den kontrollierten Fallback, wenn die Triage-KI nicht antwortet', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/triage/evaluate',
      payload: {
        symptoms: [
          { region: 'Brust', measurementType: 'pain', measurementValue: 9, duration: 'today' },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      careLevel: 'emergency',
      aiUnavailable: true,
    })
  })
})
