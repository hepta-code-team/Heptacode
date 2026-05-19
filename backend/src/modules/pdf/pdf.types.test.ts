import { describe, expect, it } from 'vitest'

import { pdfExportRequestSchema } from './pdf.types.js'

describe('pdfExportRequestSchema', () => {
  it('akzeptiert gueltige PDF-Exportdaten', () => {
    const result = pdfExportRequestSchema.safeParse({
      assessment: {
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
          conditions: [],
        },
        symptoms: [{ region: 'Kopf', painLevel: 5, duration: 'days' }],
      },
    })

    expect(result.success).toBe(true)
  })

  it('lehnt mehr als drei Symptome ab', () => {
    const result = pdfExportRequestSchema.safeParse({
      assessment: {
        symptoms: [
          { region: 'Kopf' },
          { region: 'Bauch' },
          { region: 'Ruecken' },
          { region: 'Brust' },
        ],
      },
    })

    expect(result.success).toBe(false)
  })
})
