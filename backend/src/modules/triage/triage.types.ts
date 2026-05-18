import { z } from 'zod'

// Typ für die Patientendaten
export interface PatientData {
  birthMonth: string
  birthYear: string
  height: string
  weight: string
  gender: string
  isPregnant: boolean
  isBreastfeeding: boolean
  allergies: string
  medications: string
  substanceInfluence: string
  recentAbroad: boolean
  recentAbroadDetails: string
  conditions: string[]
}

// Typ für das ausgewählte Symptom
export interface TriageSymptom {
  region: string
  side?: string
  painLevel?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}

// Typ für die Versorgungsebene
export type CareLevel = 'emergency' | 'doctor' | 'specialist' | 'selfcare'

// Typ für die Review Summary
export interface ReviewSummary {
  plainLanguage: string
  professionalSummary: string
}

// Schema fuer die erlaubten medizinischen Versorgungsangebote
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
  recommendedSpecialty: MedicalSpecialty
  reasons: string[]
<<<<<<< HEAD
  reviewSummary?: ReviewSummary
=======
  // TA 1.8: true bedeutet, dass die Empfehlung aus dem definierten Fallback kommt.
  aiUnavailable?: boolean
>>>>>>> dev
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

// Schema für Review Summary
export const reviewSummarySchema = z.object({
  plainLanguage: z.string().min(1),
  professionalSummary: z.string().min(1),
})

// Schema für die Antwort des AI
export const triageAiResultSchema = z.object({
  careLevel: z.enum(['emergency', 'doctor', 'specialist', 'selfcare']),
  recommendedSpecialty: medicalSpecialtySchema,
  reasons: z.array(z.string().min(1)).max(5),
  reviewSummary: reviewSummarySchema.optional(),
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