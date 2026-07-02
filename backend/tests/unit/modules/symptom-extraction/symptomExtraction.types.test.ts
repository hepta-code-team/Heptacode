import { describe, expect, it } from 'vitest'

import {
  symptomExtractionAiResultSchema,
  symptomExtractionRequestSchema,
  symptomInputValidationAiResultSchema,
} from '../../../../src/modules/symptom-extraction/symptomExtraction.types.js'

describe('symptomExtractionRequestSchema', () => {
  /** The current symptomText field should be accepted as the primary free-text input. */
  it('akzeptiert symptomText als Eingabe', () => {
    const result = symptomExtractionRequestSchema.safeParse({
      symptomText: 'Ich habe Fieber und Husten.',
      inputType: 'text',
    })

    expect(result.success).toBe(true)
  })

  /** The legacy input field should remain compatible with older callers. */
  it('akzeptiert den alten input-Fallback', () => {
    const result = symptomExtractionRequestSchema.safeParse({
      input: 'Mir ist seit heute schwindelig.',
    })

    expect(result.success).toBe(true)
  })

  /** Patient data should be allowed for early plausibility checks before extraction. */
  it('akzeptiert Patientendaten fuer fruehe Plausibilitaetspruefungen', () => {
    const result = symptomExtractionRequestSchema.safeParse({
      symptomText: 'Ich habe Bauchschmerzen.',
      patientData: {
        birthMonth: '05',
        birthYear: '1988',
        height: '175',
        weight: '78',
        gender: 'Maennlich',
        isPregnant: false,
        isBreastfeeding: false,
        allergies: '',
        medications: '',
        substanceInfluence: '',
        recentAbroad: '',
        recentAbroadDetails: '',
        conditions: [],
        isSmoker: '',
        smokingSinceYears: '',
        cigarettesPerDay: '',
        conditionDetails: {},
      },
    })

    expect(result.success).toBe(true)
  })

  /** Extraction requests without any free-text source should be rejected. */
  it('lehnt Anfragen ohne Freitext ab', () => {
    const result = symptomExtractionRequestSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('symptomExtractionAiResultSchema', () => {
  /** AI extraction results should accept the frontend maximum of three symptoms. */
  it('akzeptiert bis zu drei extrahierte Symptome', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        { region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' },
        { region: 'Brust' },
      ],
    })

    expect(result.success).toBe(true)
  })

  /** More than three extracted symptoms should fail schema validation. */
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

  /** Unknown complaints should remain usable as free-text symptom regions. */
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

  /** Clinically relevant details should survive symptom normalization. */
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

  /** Details that only repeat duration or intensity should be removed. */
  it('entfernt Dauer und Staerke aus Zusatzdetails', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        {
          region: 'Bauch',
          details: 'Mittelstarke Bauchschmerzen seit ein paar Tagen',
          measurementType: 'pain',
          measurementValue: 5,
          duration: 'days',
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Bauch',
      measurementType: 'pain',
      measurementValue: 5,
      duration: 'days',
    })
  })

  /** Relevant narrative details should survive even when duration and intensity are present. */
  it('behaelt echte Zusatzdetails trotz genannter Staerke und Dauer', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [
        {
          region: 'Verbrennung',
          details: 'Mittelstark, seit heute, kochendes Wasser ueber Arm geschuettet',
          measurementType: 'pain',
          measurementValue: 5,
          duration: 'today',
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toEqual({
      region: 'Verbrennung',
      details: 'kochendes Wasser ueber Arm geschuettet',
      measurementType: 'pain',
      measurementValue: 5,
      duration: 'today',
    })
  })

  /** Burn injuries should not inherit temperature measurements from the source text. */
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

  /** Fever should keep temperature as its clinically meaningful measurement type. */
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

  /** Known regions may still carry AI-extracted free-text suboptions. */
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

  /** Free-text symptoms should not be forced into taxonomy options by partial matches. */
  it('normalisiert Freitext-Symptome nicht ueber Teiltreffer auf vorhandene Optionen', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Juckender Ausschlag am Fuss' }],
    })

    expect(result.success).toBe(true)
    expect(result.data?.symptoms[0]).toMatchObject({
      region: 'Juckender Ausschlag am Fuss',
    })
  })

  /** Intensity words should not be converted into numeric measurements locally. */
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

  /** Duration phrases should not be converted into enum values locally. */
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
  /** Validation AI results should include the boolean decision and rationale. */
  it('akzeptiert gueltige Validierungsergebnisse', () => {
    const result = symptomInputValidationAiResultSchema.safeParse({
      isValidMedicalInput: false,
      reason: 'Der Text enthaelt keine medizinische Beschwerde.',
    })

    expect(result.success).toBe(true)
  })

  /** Validation rationales should not be empty. */
  it('lehnt leere Begruendungen ab', () => {
    const result = symptomInputValidationAiResultSchema.safeParse({
      isValidMedicalInput: true,
      reason: '',
    })

    expect(result.success).toBe(false)
  })
})