import { describe, expect, it } from 'vitest'

import {
  symptomExtractionAiResultSchema,
  symptomExtractionRequestSchema,
  symptomInputValidationAiResultSchema,
} from './symptomExtraction.types.js'

describe('symptomExtractionRequestSchema', () => {
  it('akzeptiert symptomText als Eingabe', () => {
    const result = symptomExtractionRequestSchema.safeParse({
      symptomText: 'Ich habe Fieber und Husten.',
      inputType: 'text',
    })

    expect(result.success).toBe(true)
  })

  it('akzeptiert den alten input-Fallback', () => {
    const result = symptomExtractionRequestSchema.safeParse({
      input: 'Mir ist seit heute schwindelig.',
    })

    expect(result.success).toBe(true)
  })

  it('lehnt Anfragen ohne Freitext ab', () => {
    const result = symptomExtractionRequestSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('symptomExtractionAiResultSchema', () => {
  it('akzeptiert bis zu drei extrahierte Symptome', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        { region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' },
        { region: 'Brust' },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('lehnt mehr als drei Symptome ab', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        { region: 'Kopf' },
        { region: 'Bauch' },
        { region: 'Ruecken' },
        { region: 'Brust' },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('akzeptiert unbekannte extrahierte Beschwerden als Freitext-Region', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Husten', measurementType: 'severity', measurementValue: 5 }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toMatchObject({
      region: 'Husten',
      measurementType: 'severity',
      measurementValue: 5,
    })
  })

  it('akzeptiert relevante Zusatzdetails zu extrahierten Symptomen', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        {
          region: 'Verbrennung',
          details: 'Kochendes Wasser ueber Arm geschuettet',
          measurementType: 'severity',
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toMatchObject({
      region: 'Verbrennung',
      details: 'Kochendes Wasser ueber Arm geschuettet',
      measurementType: 'severity',
    })
  })

  it('normalisiert faelschliche Temperaturmessung bei Verbrennung auf Schmerzskala', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        {
          region: 'Verbrennung',
          details: 'Kochendes Wasser ueber Arm geschuettet',
          measurementType: 'temperature',
          measurementValue: 100,
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Verbrennung',
      details: 'Kochendes Wasser ueber Arm geschuettet',
      measurementType: 'pain',
    })
  })

  it('behaelt Temperaturmessung bei Fieber', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        {
          region: 'Allgemein',
          side: 'Fieber',
          measurementType: 'temperature',
          measurementValue: 39.2,
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Allgemein',
      side: 'Fieber',
      measurementType: 'temperature',
      measurementValue: 39.2,
    })
  })

  it('akzeptiert unbekannte Unteroptionen fuer bekannte Regionen', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Allgemein', side: 'Husten' }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toMatchObject({
      region: 'Allgemein',
      side: 'Husten',
    })
  })

  it('normalisiert Freitext-Symptome nicht ueber Teiltreffer auf vorhandene Optionen', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Juckender Ausschlag am Fuss' }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toMatchObject({
      region: 'Juckender Ausschlag am Fuss',
    })
  })

  it('leitet Messwerte nicht lokal aus Intensitaetswoertern ab', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 'stark' }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Kopf',
      measurementType: 'pain',
    })
  })

  it('leitet Dauer nicht lokal aus Freitext ab', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Kopf', duration: 'seit heute' }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Kopf',
    })
  })
})

describe('symptomInputValidationAiResultSchema', () => {
  it('akzeptiert gueltige Validierungsergebnisse', () => {
    const result = symptomInputValidationAiResultSchema.safeParse({
      isValidMedicalInput: false,
      reason: 'Der Text enthaelt keine medizinische Beschwerde.',
    })

    expect(result.success).toBe(true)
  })

  it('lehnt leere Begruendungen ab', () => {
    const result = symptomInputValidationAiResultSchema.safeParse({
      isValidMedicalInput: true,
      reason: '',
    })

    expect(result.success).toBe(false)
  })
})
