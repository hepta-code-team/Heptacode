import { z } from 'zod'
import type { PdfExportResult } from '../pdf/pdf.types.js'

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

export interface SelectedSymptom {
  region: string
  side?: string
}

export type SymptomMeasurementType = 'pain' | 'temperature' | 'feeling' | 'severity'

export interface Symptom {
  id: string
  region: string
  side?: string
  measurementType: SymptomMeasurementType
  measurementValue: number
  duration: string
  active: boolean
}

export interface Assessment {
  patientData?: PatientData
  selectedSymptoms: SelectedSymptom[]
  symptomDetails: Symptom[]
}

export type CareLevel = 'emergency' | 'doctor' | 'selfcare'

export interface TriageRequest {
  assessment: Assessment
  emergencyFromLanding?: boolean
}

export interface TriageResponse {
  careLevel: CareLevel
  reasons: string[]
  pdfSummary: PdfExportResult
}

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

export const selectedSymptomSchema = z.object({
  region: z.string(),
  side: z.string().optional(),
})

export const symptomSchema = z.object({
  id: z.string(),
  region: z.string(),
  side: z.string().optional(),
  measurementType: z.enum(['pain', 'temperature', 'feeling', 'severity']),
  measurementValue: z.number(),
  duration: z.string(),
  active: z.boolean(),
})

export const assessmentSchema = z.object({
  patientData: patientDataSchema.optional(),
  selectedSymptoms: z.array(selectedSymptomSchema),
  symptomDetails: z.array(symptomSchema),
})

export const triageRequestSchema = z.object({
  assessment: assessmentSchema,
  emergencyFromLanding: z.boolean().optional(),
})
