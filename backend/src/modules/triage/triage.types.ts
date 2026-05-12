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
export type CareLevel = 'emergency' | 'doctor' | 'selfcare'

// Typ für die Anfrage
export interface TriageRequest {
  patientData?: PatientData
  symptoms: TriageSymptom[]
  emergencyFromLanding?: boolean
}

// Typ für die Antwort
export interface TriageResponse {
  careLevel: CareLevel
  reasons: string[]
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

// Schema für die Antwort des AI
export const triageAiResultSchema = z.object({
  careLevel: z.enum(['emergency', 'doctor', 'selfcare']),
  reasons: z.array(z.string().min(1)).max(5),
})

// Schema für die Anfrage
export const triageRequestSchema = z.object({
  patientData: patientDataSchema.optional(),
  symptoms: z.array(triageSymptomSchema).max(3),
  emergencyFromLanding: z.boolean().optional(),
})
