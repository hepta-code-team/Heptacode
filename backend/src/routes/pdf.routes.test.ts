import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../app.js'
import type { PdfExportRequest } from '../modules/pdf/pdf.types.js'

async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

function createPayload(): PdfExportRequest {
  return {
    reviewSummary: {
      plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
      professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
    },
    triage: {
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
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
      recentAbroad: false,
      recentAbroadDetails: '',
      conditions: ['Asthma'],
    },
    symptoms: [{ region: 'Kopf', side: 'links', painLevel: 6, duration: 'days' }],
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

  it('erstellt ein PDF und sendet die passenden Download-Header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pdf/export',
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="triage-review-summary.pdf"',
    )
    expect(response.body.startsWith('%PDF-1.4')).toBe(true)
    expect(response.body).toContain('Triage Review Summary')
  })

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
      message: 'Validation failed',
    })
  })
})
