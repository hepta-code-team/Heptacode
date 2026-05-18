import { z } from 'zod'
import { medicalSpecialtySchema } from '../../modules/triage/triage.types.js'

export const SummaryTriageSchema = z.object({
  careLevel: z.enum(['emergency', 'doctor', 'selfcare']),
  recommendedSpecialty: medicalSpecialtySchema,
  reasons: z.array(z.string().min(1)).max(5),
})

export const SummaryRequestSchema = z.object({
  patient: z.object({
    age: z.number().int().min(0).max(120),
    sex: z.enum(['female', 'male', 'diverse', 'unknown']),
    pregnant: z.boolean().optional(),
    knownConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
  }),

  symptoms: z.object({
    freeText: z.string().min(3),
    selectedSymptoms: z.array(z.string()).optional(),
    duration: z.string().optional(),
    severity: z.number().min(0).max(10).optional(),
    location: z.string().optional(),
    progression: z.enum(['better', 'same', 'worse', 'unknown']).optional(),
  }),

  triage: SummaryTriageSchema.optional(),

  context: z
    .object({
      language: z.enum(['de', 'en']).optional(),
      accessibilityMode: z.boolean().optional(),
    })
    .optional(),

  consent: z.object({
    acceptedDataProcessing: z.boolean(),
  }),
})

export type SummaryRequest = z.infer<typeof SummaryRequestSchema>
export type SummaryTriage = z.infer<typeof SummaryTriageSchema>

export interface SummaryResponse {
  summaryId: string

  triage?: SummaryTriage

  aiReviewSummary: {
    plainLanguage: string
    professionalSummary: string
    missingInformation: string[]
  }

  recommendation: {
    nextStep: string
    message: string
  }

  fhirPreview: {
    resourceType: 'Bundle'
    type: 'collection'
    note: string
  }

  safetyNotice: string
}
