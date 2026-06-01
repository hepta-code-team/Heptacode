import { describe, expect, it } from 'vitest'

import { createPdfSummary } from './pdfExport.service.js'

describe('createPdfSummary', () => {
  it('erstellt eine PDF-Zusammenfassung mit Patientendaten und Symptomen', () => {
    const result = createPdfSummary({
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
        conditions: ['Asthma'],
        isSmoker: false,
        smokingSinceYears: '',
        cigarettesPerDay: '',
        conditionDetails: {},
      },
      symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('utf8')

    expect(result.fileName).toBe('triage-review-summary.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.sections).toHaveLength(5)
    expect(result.sections[0]).toMatchObject({ title: 'Laienverständliche Zusammenfassung' })
    expect(result.sections[2]).toMatchObject({ title: 'Patientendaten' })
    expect(result.sections[3]).toMatchObject({ title: 'Beschwerden' })
    expect(pdfContent.startsWith('%PDF-1.4')).toBe(true)
    expect(pdfContent).toContain('Triage Review Summary')
  })

  it('erstellt auch ohne Patientendaten eine gueltige PDF', () => {
    const result = createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
      },
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('utf8')

    expect(result.sections).toHaveLength(3)
    expect(pdfContent.startsWith('%PDF-1.4')).toBe(true)
  })
})
