import { describe, expect, it } from 'vitest'

import { pdfExportRequestSchema } from '../../../../src/modules/pdf/pdf.types.js'

describe('pdfExportRequestSchema', () => {
  /** Complete export data should satisfy the PDF route contract. */
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

    expect(result.success).toBe(true)
  })

  /** PDF export requests should keep the shared three-symptom limit. */
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
