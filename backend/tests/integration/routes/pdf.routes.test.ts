import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../../src/app.js'
import type { PdfExportRequest } from '../../../src/modules/pdf/pdf.types.js'

/** Fresh Fastify instances keep route plugins and response headers isolated between cases. */
async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

/** Complete PDF export fixture aligned with the route contract. */
function createPayload(): PdfExportRequest {
  return {
    reviewSummary: {
      plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
      professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
    },
    symptomText: 'Ich habe seit gestern starke Kopfschmerzen.',
    triage: {
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
    },
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
      recentAbroad: '',
      recentAbroadDetails: '',
      conditions: ['Asthma'],
      isSmoker: '',
      smokingSinceYears: '',
      cigarettesPerDay: '',
      conditionDetails: {},
    },
    symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
  }
}

describe('POST /api/v1/pdf/export', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  /** Valid export input should produce a binary PDF download response. */
  it('erstellt ein PDF und sendet die passenden Download-Header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pdf/export',
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="medizinische-ersteinschaetzung.pdf"',
    )
    expect(response.rawPayload.toString('latin1').startsWith('%PDF-')).toBe(true)
  })

  /** Incomplete export payloads should fail at the request-validation boundary. */
  it('antwortet mit 400 bei ungueltigem PDF-Payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pdf/export',
      payload: {
        symptoms: [{ region: 'Kopf' }],
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
  })
})
