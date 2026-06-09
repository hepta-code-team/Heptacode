import { describe, expect, it } from 'vitest'

import { createPdfSummary } from '../../../../src/modules/pdf/pdfExport.service.js'

describe('createPdfSummary', () => {
  it('erstellt eine PDF-Zusammenfassung mit Patientendaten und Symptomen', async () => {
    const result = await createPdfSummary({
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

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('latin1')

    expect(result.fileName).toBe('medizinische-ersteinschaetzung.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0]).toMatchObject({ title: 'Medizinische Übersicht' })
    expect(result.sections[1]).toMatchObject({ title: 'Wichtiger Hinweis' })
    expect(pdfContent.startsWith('%PDF-')).toBe(true)
  })

  it('erstellt auch ohne Patientendaten eine gueltige PDF', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
      },
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('latin1')

    expect(result.sections).toHaveLength(2)
    expect(pdfContent.startsWith('%PDF-')).toBe(true)
  })

  it('formatiert Patientendaten und Beschwerden fuer den PDF-Export sauber', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: [
          'Patientendaten:',
          'Keine Stammdaten vorhanden.',
          '',
          'Beschwerden:',
          'Stammdaten:',
          'Geburtsmonat: 01',
          'Geburtsjahr: 2000',
          'Groesse: 175 cm',
          'Details zu Vorerkrankungen: Sonstige: Schilddruesenunterfunktion',
          'Ausgewählte Symptome:',
          '1. Brust (Brustmitte)',
          'Detailangaben zu aktiven Symptomen:',
          '1. Brust (Brustmitte), Schmerzstaerke: 7/10, Dauer: Seit ein paar Tagen',
        ].join('\n'),
      },
    })

    expect(result.sections[0]?.content).toContain('Patientendaten:\nGeburtsdatum: 01/2000')
    expect(result.sections[0]?.content).toContain('Größe: 175 cm')
    expect(result.sections[0]?.content).toContain(
      'Details zu Vorerkrankungen: Schilddrüsenunterfunktion',
    )
    expect(result.sections[0]?.content).toContain(
      'Beschwerden:\n1. Brust (Brustmitte)\nSchmerzstärke: 7/10\nDauer: Seit ein paar Tagen',
    )
    expect(result.sections[0]?.content).not.toContain('Stammdaten:')
    expect(result.sections[0]?.content).not.toContain('Ausgewählte Symptome:')
  })
})
