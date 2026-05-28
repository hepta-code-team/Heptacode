import { z } from 'zod'
import type { PatientData } from '../../../../shared/patientData.types.js'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  TRIAGE_SYMPTOM_DURATIONS,
  type TriageSymptom,
} from '../../../../shared/symptom.types.js'

export type { PatientData } from '../../../../shared/patientData.types.js'
export type { TriageSymptom } from '../../../../shared/symptom.types.js'

// Versorgungsebenen für die Triage
export const CARE_LEVELS = [
  'emergency',
  'doctor',
  'specialist',
  'selfcare',
] as const

export type CareLevel = (typeof CARE_LEVELS)[number]

// Typ für die Review Summary
export interface ReviewSummary {
  plainLanguage: string
  professionalSummary: string
}

export const reviewSummarySchema = z.object({
  plainLanguage: z.string().min(1),
  professionalSummary: z.string().min(1),
})

export const careLevelSchema = z.enum(CARE_LEVELS)

// Medizinische Versorgungsangebote
export const medicalSpecialtySchema = z.enum([
  'home_care',
  'emergency_medicine',
  'general_practice',
  'internal_medicine',
  'cardiology',
  'neurology',
  'orthopedics',
  'gastroenterology',
  'pulmonology',
  'dermatology',
  'urology',
  'gynecology',
  'psychiatry',
  'pediatrics',
  'dentistry',
  'ophthalmology',
  'otolaryngology',
])

export type MedicalSpecialty = z.infer<typeof medicalSpecialtySchema>

// Typ für die Anfrage
export interface TriageRequest {
  patientData?: PatientData
  symptoms?: TriageSymptom[]
  text?: string
  inputType?: 'text' | 'speech'
  emergencyFromLanding?: boolean
}

// Typ für die Antwort
export interface TriageResponse {
  careLevel: CareLevel
  recommendedSpecialty?: MedicalSpecialty
  reasons: string[]
  reviewSummary?: ReviewSummary

  // TA 1.8: true bedeutet, dass die Empfehlung aus dem definierten Fallback kommt.
  aiUnavailable?: boolean
}

// Schema für die Patientendaten
export const patientDataSchema = z.object({
  birthMonth: z.string(),
  birthYear: z.string(),
  height: z.string(),
  weight: z.string(),
  gender: z.string(),
  isPregnant: z.boolean(),
  isBreastfeeding: z.boolean(),
  allergies: z.string(),
  medications: z.string(),
  substanceInfluence: z.string(),
  recentAbroad: z.boolean(),
  recentAbroadDetails: z.string(),
  conditions: z.array(z.string()),
  isSmoker: z.boolean(),
  smokingSinceYears: z.string(),
  cigarettesPerDay: z.string(),
  conditionDetails: z.record(z.string(), z.string()),
})

// Schema für das ausgewählte Symptom
export const triageSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
  measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES).optional(),
  measurementValue: z.number().optional(),
  duration: z.enum(TRIAGE_SYMPTOM_DURATIONS).optional(),
})

// TA 2.5: Schema fuer validierte KI-Responses mit CareLevel, MedicalSpecialty und reasons.
export const triageAiResultSchema = z
  .object({
    careLevel: careLevelSchema,
    medicalSpecialty: medicalSpecialtySchema.nullable(),
    reasons: z.array(z.string().trim().min(1)).min(1).max(5),
  })
  .superRefine((value, ctx) => {
    if (value.careLevel === 'specialist' && value.medicalSpecialty === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicalSpecialty'],
        message: 'medicalSpecialty ist erforderlich, wenn careLevel specialist ist',
      })
    }

    if (value.careLevel !== 'specialist' && value.medicalSpecialty !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicalSpecialty'],
        message: 'medicalSpecialty muss null sein, wenn careLevel nicht specialist ist',
      })
    }
  })

export type TriageAiResponse = z.infer<typeof triageAiResultSchema>

// Schema für die Anfrage
export const triageRequestSchema = z
  .object({
    patientData: patientDataSchema.optional(),
    symptoms: z.array(triageSymptomSchema).max(3).optional(),
    text: z.string().trim().min(1).optional(),
    inputType: z.enum(['text', 'speech']).optional(),
    emergencyFromLanding: z.boolean().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.text) ||
      Boolean(value.symptoms && value.symptoms.length > 0) ||
      value.emergencyFromLanding === true,
    {
      message: 'text oder symptoms ist erforderlich',
      path: ['text'],
    },
  )
