import { z } from 'zod'
import type { PatientData } from '../../../../shared/patientData.types.js'
import {
  CARE_LEVELS,
  MEDICAL_SPECIALTIES,
} from '../../../../shared/result.types.js'
import type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
} from '../../../../shared/result.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'

export type { PatientData } from '../../../../shared/patientData.types.js'
export type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
} from '../../../../shared/result.types.js'
export type { TriageSymptom } from '../../../../shared/symptom.types.js'

// Typ für die Review Summary
export interface ReviewSummary {
  plainLanguage: string
  professionalSummary: string
}

export const careLevelSchema = z.enum(CARE_LEVELS)

export const medicalSpecialtySchema = z.enum(MEDICAL_SPECIALTIES)

export const recommendedSpecialtyItemSchema = z.object({
  specialty: medicalSpecialtySchema,
  label: z.string().min(1),
  reason: z.string().min(1),
  priority: z.number().int().min(1),
})

export type RecommendedSpecialtyItem = RecommendedSpecialty

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
  recommendedSpecialties?: RecommendedSpecialtyItem[]

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
  currentMood: z.string().optional(),
  smokerStatus: z.string().optional(),
  takesBloodThinners: z.boolean().optional(),
  immuneSystemStatus: z.string().optional(),
  immuneSystemDetails: z.string().optional(),
  drugDetails: z.string().optional(),
  allergies: z.string(),
  medications: z.string(),
  substanceInfluence: z.string(),
  recentAbroad: z.boolean(),
  recentAbroadDetails: z.string(),
  conditions: z.array(z.string()),
})

// Schema für das ausgewählte Symptom
export const triageSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
  painLevel: z.number().int().min(1).max(10).optional(),
  duration: z.enum(['today', 'days', 'week', 'weeks']).optional(),
})

// Schema für Review Summary
export const reviewSummarySchema = z.object({
  plainLanguage: z.string().min(1),
  professionalSummary: z.string().min(1),
})

// Schema für die Antwort der KI
export const triageAiResultSchema = z.object({
  careLevel: careLevelSchema,
  recommendedSpecialty: medicalSpecialtySchema.nullish().transform((value) => value ?? undefined),
  reasons: z
    .union([z.array(z.string().min(1)).min(1).max(5), z.string().min(1)])
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  reviewSummary: reviewSummarySchema.nullish().transform((value) => value ?? undefined),
})

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
