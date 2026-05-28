import { z } from 'zod'
import {
  getOptionsForRegion,
  SYMPTOM_DURATION_IDS,
  SYMPTOM_REGION_NAMES,
  type SymptomRegionName,
} from './symptomTaxonomy.js'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  type SymptomMeasurementType,
  type TriageSymptomDuration,
} from '../../../shared/symptom.types.js'

/** Ein vom Frontend direkt verwendbares extrahiertes Symptom. */
export interface ExtractedSymptom {
  region: SymptomRegionName
  side?: string
  measurementType?: SymptomMeasurementType
  measurementValue?: number
  duration?: TriageSymptomDuration
}

/** KI-Response: Symptom-Extraktion (TA2.3). */
export interface SymptomExtractionAiResult {
  symptoms: ExtractedSymptom[]
}

/** KI-Response: Freitext-Validierung vor der Extraktion. */
export interface SymptomInputValidationAiResult {
  isValidMedicalInput: boolean
  reason: string
}

export const extractedSymptomSchema = z
  .object({
    region: z.enum(SYMPTOM_REGION_NAMES),
    side: z.string().min(1).optional(),
    measurementType: z.enum(SYMPTOM_MEASUREMENT_TYPES).optional(),
    measurementValue: z.number().optional(),
    duration: z.enum(SYMPTOM_DURATION_IDS).optional(),
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

/** Strikt: maximal drei frontend-kompatible Symptome. */
export const symptomExtractionAiResultSchema = z.object({
  symptoms: z.array(extractedSymptomSchema).max(3),
})

export const symptomInputValidationAiResultSchema = z.object({
  isValidMedicalInput: z.boolean(),
  reason: z.string().min(1),
})
