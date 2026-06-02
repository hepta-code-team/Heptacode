import { z } from 'zod'
import type { SymptomExtractionAiResult, SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import { SYMPTOM_INPUT_TYPES } from '../../../../shared/symptomExtraction.types.js'
import {
  SYMPTOM_MEASUREMENT_TYPES,
  TRIAGE_SYMPTOM_DURATIONS,
  type TriageSymptom,
} from '../../../../shared/symptom.types.js'
import {
  SYMPTOM_REGION_NAMES,
  SYMPTOM_REGIONS,
  type SymptomRegionName,
} from '../../../../shared/symptomTaxonomy.js'

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

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '')
}

function emptyStringOrNullToUndefined(value: unknown): unknown {
  return value === null || value === '' ? undefined : value
}

function normalizeMeasurementValue(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value !== 'string') {
    return value
  }

  const numericMatch = value.replace(',', '.').match(/\d+(?:\.\d+)?/)

  if (numericMatch) {
    return Number(numericMatch[0])
  }

  const normalizedValue = normalizeLabel(value)

  if (/(leicht|bisschen|wenig|mild)/.test(normalizedValue)) {
    return 3
  }

  if (/(mittel|maessig|massig|moderat)/.test(normalizedValue)) {
    return 5
  }

  if (/(stark|heftig|schlimm|intensiv)/.test(normalizedValue)) {
    return 8
  }

  return value
}

function normalizeDuration(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    return value
  }

  const normalizedValue = normalizeLabel(value)

  if (normalizedValue.includes('heute')) {
    return 'today'
  }

  if (normalizedValue.includes('wochen') || normalizedValue.includes('mehrals2wochen')) {
    return 'weeks'
  }

  if (normalizedValue.includes('woche')) {
    return 'week'
  }

  if (normalizedValue.includes('tag') || normalizedValue.includes('tage')) {
    return 'days'
  }

  return value
}

const regionByNormalizedLabel = new Map(
  SYMPTOM_REGION_NAMES.map((region) => [normalizeLabel(region), region] as const),
)

const optionByNormalizedLabel = new Map(
  SYMPTOM_REGIONS.flatMap((region) =>
    region.options.map((option) => [
      normalizeLabel(option),
      {
        region: region.name,
        option,
      },
    ] as const),
  ),
)

function normalizeRegion(value: string): SymptomRegionName | undefined {
  return regionByNormalizedLabel.get(normalizeLabel(value))
}

function normalizeOption(value: string): { region: SymptomRegionName; option: string } | undefined {
  const normalizedValue = normalizeLabel(value)
  return optionByNormalizedLabel.get(normalizedValue)
}

export const extractedSymptomSchema = z
  .object({
    region: z.string().min(1),
    side: z.preprocess(emptyStringOrNullToUndefined, z.string().min(1).optional()),
    measurementType: z
      .preprocess(emptyStringOrNullToUndefined, z.enum(SYMPTOM_MEASUREMENT_TYPES).optional())
      .catch(undefined),
    measurementValue: z
      .preprocess(normalizeMeasurementValue, z.number().optional())
      .catch(undefined),
    duration: z
      .preprocess(normalizeDuration, z.enum(TRIAGE_SYMPTOM_DURATIONS).optional())
      .catch(undefined),
  })
  .transform((value) => {
    const normalizedRegion = normalizeRegion(value.region)
    const regionAsOption = normalizeOption(value.region)
    const normalizedSide = value.side ? normalizeOption(value.side) : undefined
    const region = normalizedRegion ?? regionAsOption?.region ?? value.region
    const side =
      normalizedSide && normalizedSide.region === region
        ? normalizedSide.option
        : regionAsOption && regionAsOption.region === region
          ? regionAsOption.option
          : value.side

    return {
      ...value,
      region,
      ...(side ? { side } : {}),
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
