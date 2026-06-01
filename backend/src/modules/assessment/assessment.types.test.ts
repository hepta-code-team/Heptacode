import { describe, expect, it } from 'vitest'

import {
  assessmentResultSchema,
  assessmentPayloadSchema,
  symptomSchema,
} from './assessment.types.js'

const validPatientData = {
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
}

const validSymptom = {
  id: 'symptom-1',
  region: 'Kopf',
  side: 'links',
  measurementType: 'pain',
  measurementValue: 6,
  duration: 'days',
  active: true,
}

describe('symptomSchema', () => {
  it('akzeptiert gueltige Symptomdetails', () => {
    const result = symptomSchema.safeParse(validSymptom)

    expect(result.success).toBe(true)
  })

  it('lehnt unbekannte Messarten ab', () => {
    const result = symptomSchema.safeParse({
      ...validSymptom,
      measurementType: 'unknown',
    })

    expect(result.success).toBe(false)
  })

  it('lehnt leere Pflichtfelder ab', () => {
    const result = symptomSchema.safeParse({
      ...validSymptom,
      id: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('assessmentPayloadSchema', () => {
  it('akzeptiert gueltige Assessment-Daten', () => {
    const result = assessmentPayloadSchema.safeParse({
      patientData: validPatientData,
      selectedSymptoms: [{ region: 'Kopf', side: 'links' }],
      symptomDetails: [validSymptom],
    })

    expect(result.success).toBe(true)
  })

  it('lehnt Assessments ohne Detailangaben ab', () => {
    const result = assessmentPayloadSchema.safeParse({
      patientData: validPatientData,
      selectedSymptoms: [{ region: 'Kopf' }],
      symptomDetails: [],
    })

    expect(result.success).toBe(false)
  })

  it('lehnt unvollstaendige Patientendaten ab', () => {
    const result = assessmentPayloadSchema.safeParse({
      patientData: {
        ...validPatientData,
        birthYear: '',
      },
      selectedSymptoms: [{ region: 'Kopf' }],
      symptomDetails: [validSymptom],
    })

    expect(result.success).toBe(false)
  })
})

describe('assessmentResultSchema', () => {
  it('akzeptiert gueltige KI-Ergebnisse', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })

    expect(result.success).toBe(true)
  })

  it('lehnt leere Gruende ab', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      reasons: [],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })

    expect(result.success).toBe(false)
  })

  it('lehnt mehr als fuenf Gruende ab', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      reasons: ['1', '2', '3', '4', '5', '6'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
    })

    expect(result.success).toBe(false)
  })
})
