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
import { SYMPTOM_INPUT_TYPES } from '../../../../shared/symptomExtraction.types.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  TRIAGE_SYMPTOM_DURATIONS,
  type TriageSymptom,
} from '../../../../shared/symptom.types.js'

export type { PatientData } from '../../../../shared/patientData.types.js'
export type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
} from '../../../../shared/result.types.js'
export type { TriageSymptom } from '../../../../shared/symptom.types.js'

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
  priority: z.number(),
})

export interface TriageRequest {
  patientData?: PatientData
  symptoms?: TriageSymptom[]
  text?: string
  inputType?: SymptomInputType
  emergencyFromLanding?: boolean
}

export interface TriageResponse {
  careLevel: CareLevel
  recommendedSpecialty?: MedicalSpecialty
  recommendedSpecialties?: RecommendedSpecialty[]
  reasons: string[]
  reviewSummary?: ReviewSummary
  aiUnavailable?: boolean
  aiModel?: string
}

export const reviewSummarySchema = z.object({
  plainLanguage: z.string().min(1),
  professionalSummary: z.string().min(1),
})

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

export const recommendedSpecialtyItemSchema = z.object({
  specialty: medicalSpecialtySchema,
  label: z.string().min(1),
  reason: z.string().min(1),
  priority: z.number().int(),
})

export const triageSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
  measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES).optional(),
  measurementValue: z.number().optional(),
  duration: z.enum(TRIAGE_SYMPTOM_DURATIONS).optional(),
})

export const triageRequestSchema = z
  .object({
    patientData: patientDataSchema.optional(),
    symptoms: z.array(triageSymptomSchema).max(3).optional(),
    text: z.string().trim().min(1).optional(),
    inputType: z.enum(SYMPTOM_INPUT_TYPES).optional(),
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
