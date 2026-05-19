import { describe, expect, it } from 'vitest'

import { createPdfSummary } from './pdfExport.service.js'

describe('createPdfSummary', () => {
  it('erstellt eine PDF-Zusammenfassung mit Patientendaten und Symptomen', () => {
    const result = createPdfSummary({
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
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('utf8')

    expect(result.fileName).toBe('triage-summary.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0]).toMatchObject({ title: 'Patientendaten' })
    expect(result.sections[1]).toMatchObject({ title: 'Beschwerden' })
    expect(pdfContent.startsWith('%PDF-1.4')).toBe(true)
    expect(pdfContent).toContain('Triage Summary')
  })

  it('erstellt auch ohne Patientendaten eine gueltige PDF', () => {
    const result = createPdfSummary({
      symptoms: [],
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('utf8')

    expect(result.sections).toEqual([])
    expect(pdfContent.startsWith('%PDF-1.4')).toBe(true)
  })
})
