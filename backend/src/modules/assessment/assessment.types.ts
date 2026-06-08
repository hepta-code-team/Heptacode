import { z } from 'zod'
import { CARE_LEVELS, MEDICAL_SPECIALTIES } from '../../../../shared/result.types.js'
import { SYMPTOM_MEASUREMENT_TYPES, TRIAGE_SYMPTOM_DURATIONS } from '../../../../shared/symptom.types.js'
import {
  patientDataSchema,
  recommendedSpecialtyItemSchema,
  reviewSummarySchema,
} from '../triage/triage.types.js'

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

export const assessmentResultSchema = z.object({
  careLevel: z.enum(CARE_LEVELS),
  recommendedSpecialty: z.enum(MEDICAL_SPECIALTIES),
  reasons: z.array(z.string().min(1)).min(1).max(5),
  reviewSummary: reviewSummarySchema,
  recommendedSpecialties: z.array(recommendedSpecialtyItemSchema).optional(),
  summary: z.string().min(1),
  aiUnavailable: z.boolean().optional(),
  aiModel: z.string().min(1).optional(),
  createdAt: z.string().min(1),
})

export type AssessmentPayload = z.infer<typeof assessmentPayloadSchema>
export type AssessmentResult = z.infer<typeof assessmentResultSchema>
export type Symptom = z.infer<typeof symptomSchema>
