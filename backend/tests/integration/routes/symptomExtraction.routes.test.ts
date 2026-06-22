import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../src/ai/timeout.js'
import { buildApp } from '../../../src/app.js'

vi.mock('../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

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
          { region: 'Kopf', measurementType: 'pain', measurementValue: 7, duration: 'days' },
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
        { region: 'Kopf', measurementType: 'pain', measurementValue: 7, duration: 'days' },
        { region: 'Allgemein', side: 'Uebelkeit/Schwindel' },
      ],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        schemaName: 'symptom_input_validation_result',
        temperature: 0,
        modelStrategy: 'fallback-only',
      }),
    )
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        schemaName: 'symptom_extraction_result',
        temperature: 0,
        modelStrategy: 'fallback-only',
      }),
    )
  })

  it('gibt nicht abgedeckte Verletzungsereignisse als Freitext-Symptom fuer die Detailseite zurueck', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinischer Verletzungskontext erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [
          {
            region: 'In Nagel getreten',
            side: 'Fuß',
            details: 'Nagel steckt tief im Fuß',
            measurementType: 'severity',
          },
        ],
      })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        text: 'Der Nagel steckt tief in meinem Fuß.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'Der Nagel steckt tief in meinem Fuß.',
      inputType: 'text',
      symptoms: [
        {
          region: 'In Nagel getreten',
          side: 'Fuß',
          details: 'Nagel steckt tief im Fuß',
          measurementType: 'severity',
        },
      ],
    })
  })

  it('akzeptiert input als kompatibles Eingabefeld', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'today' }],
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
      symptoms: [{ region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'today' }],
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

  it('antwortet beim Freitext-Absenden mit invalidInput bei logisch widerspruechlichen Schwangerschaftsangaben', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/extraction',
      payload: {
        symptomText: 'Ich waere schwanger und habe Wehen.',
        patientData: malePatientData,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      text: 'Ich waere schwanger und habe Wehen.',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: expect.stringContaining('passen logisch nicht zusammen'),
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
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is invalid',
      },
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

  it('validiert bearbeitete Symptomtexte ueber eine eigene HTTP-Route', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: true,
      reason: 'Medizinischer Kontext erkannt.',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/validation',
      payload: {
        text: 'Verbrennung, kochendes Wasser ueber Arm geschuettet',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'Verbrennung, kochendes Wasser ueber Arm geschuettet',
      inputType: 'text',
      isValidMedicalInput: true,
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
  })

  it('lehnt nicht-medizinischen Kontext ueber die Validierungsroute ab', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: false,
      reason: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/validation',
      payload: {
        text: 'Ich mag Pizza und Filme.',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'Ich mag Pizza und Filme.',
      inputType: 'text',
      isValidMedicalInput: false,
      message: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })
  })

  it('blockiert einen klaren Region-Detail-Widerspruch ueber die Konsistenzroute ohne KI', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/consistency',
      payload: {
        region: 'Bein',
        details: 'Schnittwunde in der Hand',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      isRegionMeaningful: true,
      hasClearContradiction: true,
      selectedLocationIds: ['legs'],
      detailLocationIds: ['arms'],
      selectedLocationConfidence: 'high',
      detailLocationConfidence: 'high',
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })
})
