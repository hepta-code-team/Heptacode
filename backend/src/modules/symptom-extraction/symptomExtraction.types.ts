import { z } from 'zod'
import type { SymptomExtractionAiResult, SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import { SYMPTOM_INPUT_TYPES } from '../../../../shared/symptomExtraction.types.js'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  TRIAGE_SYMPTOM_DURATIONS,
  type TriageSymptom,
} from '../../../../shared/symptom.types.js'
import { getOptionsForRegion, SYMPTOM_REGION_NAMES } from '../../../../shared/symptomTaxonomy.js'

export type { SymptomExtractionAiResult, TriageSymptom }

// Typ für die Anfrage
export interface SymptomExtractionRequest {
  symptomText?: string
  text: string
  input?: string
  inputType?: SymptomInputType
}

// Typ für die Antwort
export interface SymptomExtractionResponse {
  text: string
  inputType: SymptomInputType
  symptoms: TriageSymptom[]
  invalidInput?: boolean
  // TA 1.8: true bedeutet, dass keine KI-Antwort rechtzeitig oder strukturiert verfuegbar war.
  aiUnavailable?: boolean
  message?: string
}

export const extractedSymptomSchema = z
  .object({
    region: z.enum(SYMPTOM_REGION_NAMES),
    side: z.string().min(1).optional(),
    measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES).optional(),
    measurementValue: z.number().optional(),
    duration: z.enum(TRIAGE_SYMPTOM_DURATIONS).optional(),
  })
  .superRefine((value, context) => {
    if (!value.side) {
      return
    }

    const allowedOptions = getOptionsForRegion(value.region)
    if (!allowedOptions.includes(value.side)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['side'],
        message: `side must be one of the options for region "${value.region}"`,
      })
    }
  })

export const symptomExtractionAiResultSchema = z.object({
  symptoms: z.array(extractedSymptomSchema).max(3),
})

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
    inputType: z.enum(SYMPTOM_INPUT_TYPES).optional(),
  })
  .refine((value) => Boolean(value.symptomText ?? value.text ?? value.input), {
    message: 'symptomText is required',
    path: ['symptomText'],
  })
