import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../src/ai/timeout.js'
import { buildApp } from '../../../src/app.js'

vi.mock('../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

/** Shared patient fixture for payloads that include demographics. */
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

/** Creates an isolated Fastify instance for each route test. */
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

  /** Medical free text should pass validation and return structured extracted symptoms. */
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

  /** Injury descriptions outside the fixed taxonomy should remain available as free text. */
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

  /** The legacy input field should remain compatible with the extraction contract. */
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

  /** Heuristically invalid text should be handled without model execution. */
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

  /** Demographic contradictions should be returned as invalid input, not route errors. */
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

  /** Missing text fields should fail at the request-validation boundary. */
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

  /** Extraction-model failures should surface as a controlled aiUnavailable response. */
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

  /** Edited symptom text should use the dedicated validation route contract. */
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

  /** Non-medical text is a domain-level rejection, not an HTTP error. */
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

  /** Clear taxonomy matches should be rejected without invoking the model. */
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

  /** Symptom detail validation should use the dedicated detail-validation route contract. */
  it('validiert kurze Symptomdetails ueber die Detail-Validierungsroute', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: true,
      reason: 'Kurzes medizinisches Detail erkannt.',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/detail-validation',
      payload: {
        text: 'links',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      text: 'links',
      inputType: 'text',
      isValidMedicalInput: true,
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'symptom_detail_validation_result',
        modelStrategy: 'fallback-only',
      }),
    )
  })

  /** Empty symptom details should fail at the request-validation boundary. */
  it('antwortet mit 400 bei leerer Detailangabe', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/symptoms/detail-validation',
      payload: {
        text: '   ',
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
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })
})
