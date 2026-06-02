import { describe, expect, it } from 'vitest'

import {
  symptomExtractionAiResultSchema,
  symptomExtractionRequestSchema,
  symptomInputValidationAiResultSchema,
} from '../../../../src/modules/symptom-extraction/symptomExtraction.types.js'

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

  it('lehnt unbekannte Regionen ab', () => {
    const result = symptomExtractionAiResultSchema.safeParse({
      symptoms: [{ region: 'Unbekannt' }],
    })

    expect(result.success).toBe(false)
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
