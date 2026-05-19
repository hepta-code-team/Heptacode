import { z } from 'zod'
import { CARE_LEVELS, MEDICAL_SPECIALTIES } from "../../../../shared/result.types.js";
import type { CareLevel, MedicalSpecialty } from "../../../../shared/result.types.js";
import type { PatientData } from "../../../../shared/patientData.types.js";
import type { TriageSymptom } from "../../../../shared/symptom.types.js";

export const careLevelSchema = z.enum(CARE_LEVELS)
export const medicalSpecialtySchema = z.enum(MEDICAL_SPECIALTIES)

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

// TA 2.5: Schema fuer validierte KI-Responses mit CareLevel, MedicalSpecialty und reasons.
export const triageAiResultSchema = z
  .object({
    careLevel: careLevelSchema,
    medicalSpecialty: medicalSpecialtySchema.nullable(),
    reasons: z.array(z.string().trim().min(1)).min(1).max(5),
  })
  .superRefine((value, ctx) => {
    if (value.careLevel === 'specialist' && value.medicalSpecialty === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicalSpecialty'],
        message: 'medicalSpecialty ist erforderlich, wenn careLevel specialist ist',
      })
    }

    if (value.careLevel !== 'specialist' && value.medicalSpecialty !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicalSpecialty'],
        message: 'medicalSpecialty muss null sein, wenn careLevel nicht specialist ist',
      })
    }
  })

export type TriageAiResponse = z.infer<typeof triageAiResultSchema>

// Schema für die Anfrage
export const triageRequestSchema = z.object({
  patientData: patientDataSchema.optional(),
  symptoms: z.array(triageSymptomSchema).max(3).optional(),
  text: z.string().trim().min(1).optional(),
  inputType: z.enum(['text', 'speech']).optional(),
  emergencyFromLanding: z.boolean().optional(),
}).refine((value) => Boolean(value.text) || Boolean(value.symptoms && value.symptoms.length > 0), {
  message: 'text oder symptoms ist erforderlich',
  path: ['text'],
})
