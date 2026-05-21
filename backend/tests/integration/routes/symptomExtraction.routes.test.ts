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

describe('POST /api/v1/symptoms/extraction', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('extrahiert Symptome aus Freitext ueber die komplette HTTP-Route', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [
          { region: 'Kopf', painLevel: 7, duration: 'days' },
          { region: 'Allgemein', side: 'Uebelkeit/Schwindel' },
        ],
      })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        text: 'Ich habe seit ein paar Tagen starke Kopfschmerzen und Uebelkeit.',
        inputType: 'speech',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'Ich habe seit ein paar Tagen starke Kopfschmerzen und Uebelkeit.',
      inputType: 'speech',
      symptoms: [
        { region: 'Kopf', painLevel: 7, duration: 'days' },
        { region: 'Allgemein', side: 'Uebelkeit/Schwindel' },
      ],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        schemaName: 'symptom_input_validation_result',
        temperature: 0,
      }),
    )
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        schemaName: 'symptom_extraction_result',
        temperature: 0,
      }),
    )
  })

  it('akzeptiert input als kompatibles Eingabefeld', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Bauch', painLevel: 5, duration: 'today' }],
      })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        input: 'Seit heute Bauchschmerzen.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'Seit heute Bauchschmerzen.',
      inputType: 'text',
      symptoms: [{ region: 'Bauch', painLevel: 5, duration: 'today' }],
    })
  })

  it('antwortet bei offensichtlich zu kurzer Eingabe kontrolliert ohne KI-Aufruf', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        text: 'aua',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      text: 'aua',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('antwortet mit 400 bei ungueltigem Request-Body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      message: 'Validation failed',
    })
  })

  it('liefert einen kontrollierten Fallback, wenn die Extraktions-KI nicht antwortet', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockRejectedValueOnce(new AiResponseError('timeout'))

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        text: 'Ich habe starke Rueckenschmerzen.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      text: 'Ich habe starke Rueckenschmerzen.',
      inputType: 'text',
      symptoms: [],
      aiUnavailable: true,
    })
  })
})
