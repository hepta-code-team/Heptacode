import { z } from 'zod'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  TRIAGE_SYMPTOM_DURATIONS,
  type TriageSymptom,
} from '../../../../shared/symptom.types.js'

export type ExtractedSymptom = TriageSymptom

// Typ für die Anfrage
export interface SymptomExtractionRequest {
  symptomText?: string
  text: string
  input?: string
  inputType?: 'text' | 'speech'
}

// Typ für die Antwort
export interface SymptomExtractionResponse {
  text: string
  inputType: 'text' | 'speech'
  symptoms: ExtractedSymptom[]
  invalidInput?: boolean
  // TA 1.8: true bedeutet, dass keine KI-Antwort rechtzeitig oder strukturiert verfuegbar war.
  aiUnavailable?: boolean
  message?: string
}

// Schema für das ausgewählte Symptom
export const extractedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
  measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES).optional(),
  measurementValue: z.number().optional(),
  duration: z.enum(TRIAGE_SYMPTOM_DURATIONS).optional(),
})

// Strict AI output contract: Das Model darf nur bis zu drei frontend-kompatible Symptome zurückgeben.
export const symptomExtractionAiResultSchema = z.object({
  symptoms: z.array(extractedSymptomSchema).max(3),
})

// Strict AI output contract: Das Model bewertet, ob überhaupt medizinisch sinnvoller Freitext vorliegt.
export const symptomInputValidationAiResultSchema = z.object({
  isValidMedicalInput: z.boolean(),
  reason: z.string().min(1),
})

// Also ich habe hier symptomText hinzugefügt da wir das in TA1.4 haben wollen.
export const symptomExtractionRequestSchema = z
  .object({
    symptomText: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).optional(),
    input: z.string().trim().min(1).optional(),
    inputType: z.enum(['text', 'speech']).optional(),
  })
  .refine((value) => Boolean(value.symptomText ?? value.text ?? value.input), {
    message: 'symptomText is required',
    path: ['symptomText'],
  })
