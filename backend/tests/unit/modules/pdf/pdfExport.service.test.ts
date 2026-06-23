import { describe, expect, it } from 'vitest'

import { createPdfSummary } from '../../../../src/modules/pdf/pdfExport.service.js'

describe('createPdfSummary', () => {
  /** Complete clinical context should render a valid PDF summary with expected sections. */
  it('erstellt eine PDF-Zusammenfassung mit Patientendaten und Symptomen', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Ihre Angaben sprechen für eine hausärztliche Abklärung.',
        professionalSummary: 'Strukturierte medizinische Zusammenfassung.',
      },
      symptomText: 'Ich habe seit gestern starke Kopfschmerzen.',
      aiModel: 'test-model',
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
        medicationDuration: ''
      },
      symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
    })

    const pdfContent = Buffer.from(result.contentBase64, 'base64').toString('latin1')

    expect(result.fileName).toBe('medizinische-ersteinschaetzung.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0]).toMatchObject({ title: 'Medizinische Übersicht' })
    expect(result.sections[0]?.content).toContain(
      'Ihre Eingabe: „Ich habe seit gestern starke Kopfschmerzen.“',
    )
    expect(result.sections[1]).toMatchObject({ title: 'Wichtiger Hinweis' })
    expect(pdfContent.startsWith('%PDF-')).toBe(true)
  })

  /** Missing optional patient data should not prevent PDF generation. */
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

  /** Professional summaries should be normalized into clean patient and complaint sections. */
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
    expect(result.sections[0]?.content).not.toContain('Details zu Vorerkrankungen')
    expect(result.sections[0]?.content).toContain(
      'Beschwerden:\n1. Brust (Brustmitte)\nSchmerzstärke: 7/10\nDauer: Seit ein paar Tagen',
    )
    expect(result.sections[0]?.content).not.toContain('Stammdaten:')
    expect(result.sections[0]?.content).not.toContain('Ausgewählte Symptome:')
  })

  /** Structured payload data should feed the medical overview when summary text is sparse. */
  it('formatiert Triage-Empfehlungen und optionale Symptominformationen im medizinischen Ueberblick', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Ihre Angaben sprechen für eine hausärztliche Abklärung.',
        professionalSummary: '',
      },
      patientData: {
        birthMonth: '03',
        birthYear: '1985',
        height: '180',
        weight: '82',
        gender: 'male',
        isPregnant: false,
        isBreastfeeding: false,
        allergies: 'Hausstaub',
        medications: 'Ramipril',
        substanceInfluence: 'Nein',
        recentAbroad: true,
        recentAbroadDetails: '',
        conditions: ['Sonstige'],
        isSmoker: true,
        smokingSinceYears: '12',
        cigarettesPerDay: '8',
        conditionDetails: {
          Sonstige: {
            condition: 'Sonstige',
            detail: 'Sonstige: Herzrhythmusstoerungen',
            duration: '',
          },
        },
        medicationDuration: ''
      },
      symptoms: [
        {
          region: 'Brust',
          side: 'Brustmitte',
          details: 'Atemabhaengig',
          measurementType: 'temperature',
          measurementValue: 39.2,
          duration: 'week',
        },
        {
          region: 'Allgemein',
          measurementType: 'feeling',
          measurementValue: 8,
          duration: 'weeks',
        },
      ],
      triage: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich eingestuft werden.'],
      },
    })

    expect(result.sections[0]?.content).toContain('Geschlecht:')
    expect(result.sections[0]?.content).toContain('Reise ins Ausland: Ja')
    expect(result.sections[0]?.content).toContain('Raucher: Ja')
    expect(result.sections[0]?.content).toContain('Temperatur: 39.2')
    expect(result.sections[0]?.content).toContain('8/10')
    expect(result.sections[0]?.content).toContain('Dauer: Seit einer Woche')
    expect(result.sections[0]?.content).toContain('Dauer: Seit mehreren Wochen')
    expect(result.sections[0]?.content).toContain('Ihre Angaben sprechen für eine hausärztliche Abklärung.')
  })

  /** Specialist recommendations should render their user-facing specialty label. */
  it('zeigt die empfohlene Fachrichtung an, wenn sie vorhanden ist', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden fachärztlich abklären.',
        professionalSummary: '',
      },
      triage: {
        careLevel: 'specialist',
        recommendedSpecialty: 'cardiology',
        reasons: ['Eine kardiologische Abklärung ist sinnvoll.'],
      },
    })

    expect(result.sections[0]?.content).toContain('Empfohlene Fachrichtung: Kardiologie')
    expect(result.sections[0]?.content).toContain(
      'Empfohlene Fachrichtung: Kardiologie\n\nBegründung der Empfehlung:',
    )
  })

  /** Plain-language summaries should be used as the recommendation rationale when present. */
  it('nutzt die Plain-Language-Zusammenfassung als Begruendung der Empfehlung', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah ärztlich abklären.',
        professionalSummary: '',
      },
      triage: {
        careLevel: 'custom' as never,
        reasons: ['Begruendung mit Satzzeichen;', ' zweiter Grund,'],
      },
    })

    expect(result.sections[0]?.content).toContain(
      'Begründung der Empfehlung: \nBitte lassen Sie die Beschwerden zeitnah ärztlich abklären.',
    )
    expect(result.sections[0]?.content).not.toContain('zweiter Grund')
  })

  /** Travel metadata from patient data should be rendered in readable German date format. */
  it('formatiert Reisedetails in Patientendaten lesbar', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: '',
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
        recentAbroad: true,
        recentAbroadDetails: 'Kroatien | 2026-06-01 | 2026-06-14',
        conditions: [],
        isSmoker: false,
        smokingSinceYears: '',
        cigarettesPerDay: '',
        conditionDetails: {},
        medicationDuration: ''
      },
    })

    expect(result.sections[0]?.content).toContain('Reise ins Ausland: Kroatien, 01.06.2026 bis 14.06.2026')
  })

  /** Travel metadata embedded in professional summaries should be normalized for the PDF. */
  it('normalisiert Reisedetails aus strukturierten Zusammenfassungen', async () => {
    const result = await createPdfSummary({
      reviewSummary: {
        plainLanguage: 'Die Beschwerden wurden zusammengefasst.',
        professionalSummary: [
          'Patientendaten:',
          'Reise ins Ausland: Kroatien | 2026-06-01 | 2026-06-14',
          '',
          'Beschwerden:',
          'Keine Beschwerden vorhanden.',
        ].join('\n'),
      },
    })

    expect(result.sections[0]?.content).toContain('Reise ins Ausland: Kroatien, 01.06.2026 bis 14.06.2026')
  })
})
