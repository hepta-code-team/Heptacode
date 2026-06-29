import { describe, expect, it } from 'vitest'

import {
  assessmentPayloadSchema,
  assessmentResultSchema,
  symptomSchema,
} from '../../../../src/modules/assessment/assessment.types.js'

/** Shared valid patient fixture for assessment schema boundaries. */
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
  recentAbroad: '',
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: '',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

/** Shared valid symptom fixture for assessment schema boundaries. */
const validSymptom = {
  id: 'symptom-1',
  region: 'Kopf',
  side: 'links',
  details: 'Seit dem Aufwachen schlimmer',
  measurementType: 'pain',
  measurementValue: 6,
  duration: 'days',
  active: true,
}

describe('symptomSchema', () => {
  /** Complete symptom details should satisfy the assessment symptom contract. */
  it('akzeptiert gueltige Symptomdetails', () => {
    const result = symptomSchema.safeParse(validSymptom)

    expect(result.success).toBe(true)
  })

  /** Unknown measurement types should not pass symptom validation. */
  it('lehnt unbekannte Messarten ab', () => {
    const result = symptomSchema.safeParse({
      ...validSymptom,
      measurementType: 'unknown',
    })

    expect(result.success).toBe(false)
  })

  /** Required symptom fields should not accept empty values. */
  it('lehnt leere Pflichtfelder ab', () => {
    const result = symptomSchema.safeParse({
      ...validSymptom,
      id: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('assessmentPayloadSchema', () => {
  /** Complete frontend assessment payloads should satisfy the API contract. */
  it('akzeptiert gueltige Assessment-Daten', () => {
    const result = assessmentPayloadSchema.safeParse({
      patientData: validPatientData,
      selectedSymptoms: [{ region: 'Kopf', side: 'links' }],
      symptomDetails: [validSymptom],
    })

    expect(result.success).toBe(true)
  })

  /** Assessment submission should require at least one detailed symptom. */
  it('lehnt Assessments ohne Detailangaben ab', () => {
    const result = assessmentPayloadSchema.safeParse({
      patientData: validPatientData,
      selectedSymptoms: [{ region: 'Kopf' }],
      symptomDetails: [],
    })

    expect(result.success).toBe(false)
  })

  /** Patient data should remain structurally complete in assessment submissions. */
  it('lehnt unvollstaendige Patientendaten ab', () => {
    const incompletePatientData: Partial<typeof validPatientData> = { ...validPatientData }
    delete incompletePatientData.conditionDetails

    const result = assessmentPayloadSchema.safeParse({
      patientData: incompletePatientData,
      selectedSymptoms: [{ region: 'Kopf' }],
      symptomDetails: [validSymptom],
    })

    expect(result.success).toBe(false)
  })
})

describe('assessmentResultSchema', () => {
  /** Complete AI-backed assessment results should match the frontend response shape. */
  it('akzeptiert gueltige KI-Ergebnisse', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
      createdAt: '2026-06-01T00:00:00.000Z',
    })

    expect(result.success).toBe(true)
  })

  /** Assessment results should include at least one reason. */
  it('lehnt leere Gruende ab', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      reasons: [],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
      createdAt: '2026-06-01T00:00:00.000Z',
    })

    expect(result.success).toBe(false)
  })

  /** Assessment results should cap the number of reasons exposed to clients. */
  it('lehnt mehr als fuenf Gruende ab', () => {
    const result = assessmentResultSchema.safeParse({
      careLevel: 'doctor',
      reasons: ['1', '2', '3', '4', '5', '6'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
      createdAt: '2026-06-01T00:00:00.000Z',
    })

    expect(result.success).toBe(false)
  })
})