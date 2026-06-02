import { z } from 'zod'
import type { PatientData } from '../../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'

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

export const recommendedSpecialtyItemSchema = z.object({
  specialty: medicalSpecialtySchema,
  label: z.string().min(1),
  reason: z.string().min(1),
  priority: z.number().int().min(1),
})

export type RecommendedSpecialtyItem = z.infer<typeof recommendedSpecialtyItemSchema>

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
  recommendedSpecialty: MedicalSpecialty
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

// Schema für die Antwort der KI
export const triageAiResultSchema = z.object({
  careLevel: careLevelSchema,
  recommendedSpecialty: medicalSpecialtySchema,
  reasons: z
    .union([z.array(z.string().min(1)).min(1).max(5), z.string().min(1)])
    .transform((value) => (typeof value === 'string' ? [value] : value)),
  reviewSummary: reviewSummarySchema.nullish().transform((value) => value ?? undefined),
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
