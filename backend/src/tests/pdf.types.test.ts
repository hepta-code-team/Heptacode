import { describe, expect, it } from 'vitest'

import { pdfExportRequestSchema } from '../modules/pdf/pdf.types.js'

describe('pdfExportRequestSchema', () => {
  it('akzeptiert gueltige PDF-Exportdaten', () => {
    const result = pdfExportRequestSchema.safeParse({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
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
        conditions: [],
        isSmoker: false,
        smokingSinceYears: '',
        cigarettesPerDay: '',
        conditionDetails: {},
      },
      symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 5, duration: 'days' }],
    })

    if (!result.success) {
      console.log(JSON.stringify(result.error.format(), null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('lehnt mehr als drei Symptome ab', () => {
    const result = pdfExportRequestSchema.safeParse({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
      },
      symptoms: [
        { region: 'Kopf' },
        { region: 'Bauch' },
        { region: 'Ruecken' },
        { region: 'Brust' },
      ],
    })

    expect(result.success).toBe(false)
  })
})
