import { z } from 'zod'
import {
  careLevelSchema,
  medicalSpecialtySchema,
  recommendedSpecialtyItemSchema,
  reviewSummarySchema,
} from '../triage/triage.types.js'

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
})

export const selectedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().optional(),
})

export const symptomSchema = z.object({
  id: z.string().min(1),
  region: z.string().min(1),
  side: z.string().optional(),
  measurementType: z.enum(['pain', 'temperature', 'feeling', 'severity']),
  measurementValue: z.number(),
  duration: z.string().min(1),
  active: z.boolean(),
})

export const assessmentPayloadSchema = z.object({
  patientData: patientDataSchema,
  selectedSymptoms: z.array(selectedSymptomSchema),
  symptomDetails: z.array(symptomSchema).min(1),
})

export const assessmentResultSchema = z.object({
  careLevel: careLevelSchema,
  recommendedSpecialty: medicalSpecialtySchema.optional(),
  reasons: z.array(z.string().min(1)).min(1).max(5),
  reviewSummary: reviewSummarySchema,
  recommendedSpecialties: z.array(recommendedSpecialtyItemSchema).optional(),
  summary: z.string().min(1),
  aiUnavailable: z.boolean().optional(),
  createdAt: z.string().min(1),
})

export type AssessmentPayload = z.infer<typeof assessmentPayloadSchema>
export type AssessmentResult = z.infer<typeof assessmentResultSchema>
export type Symptom = z.infer<typeof symptomSchema>
