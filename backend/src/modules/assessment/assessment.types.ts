import { z } from 'zod'
import { CARE_LEVELS, MEDICAL_SPECIALTIES } from '../../../../shared/result.types.js'
import { SYMPTOM_MEASUREMENT_TYPES, TRIAGE_SYMPTOM_DURATIONS } from '../../../../shared/symptom.types.js'

export const patientDataSchema = z.object({
  birthMonth: z.string().min(1),
  birthYear: z.string().min(1),
  height: z.string().min(1),
  weight: z.string().min(1),
  gender: z.string().min(1),
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

export const selectedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().optional(),
})

export const symptomSchema = z.object({
  id: z.string().min(1),
  region: z.string().min(1),
  side: z.string().optional(),
  measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES),
  measurementValue: z.number(),
  duration: z.enum(TRIAGE_SYMPTOM_DURATIONS),
  active: z.boolean(),
})

export const assessmentPayloadSchema = z.object({
  patientData: patientDataSchema,
  selectedSymptoms: z.array(selectedSymptomSchema),
  symptomDetails: z.array(symptomSchema).min(1),
})

export const assessmentAiResultSchema = z.object({
  careLevel: z.enum(CARE_LEVELS),
  recommendedSpecialty: z.enum(MEDICAL_SPECIALTIES).optional(),
  reasons: z.array(z.string().min(1)).min(1).max(5),
  summary: z.string().min(1),
})

export type AssessmentPayload = z.infer<typeof assessmentPayloadSchema>
export type AssessmentResult = z.infer<typeof assessmentAiResultSchema> & {
  createdAt: string
}
export type Symptom = z.infer<typeof symptomSchema>
