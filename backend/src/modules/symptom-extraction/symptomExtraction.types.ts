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

function isFeverSymptom(region: string, side?: string): boolean {
  return normalizeLabel(region) === 'fieber' || (
    normalizeLabel(region) === 'allgemein' &&
    side !== undefined &&
    normalizeLabel(side) === 'fieber'
  )
}

function normalizeDetails(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const cleaned = value
    .replace(/\b(?:seit\s+)?(?:heute|gestern)\b/gi, ' ')
    .replace(/\bseit\s+(?:ein\s+paar|mehreren?|einigen?|wenigen?|[2-6])\s+tag(?:en|e)?\b/gi, ' ')
    .replace(/\bseit\s+(?:einer\s+)?woche\b/gi, ' ')
    .replace(/\bseit\s+(?:mehr\s+als\s+)?(?:zwei|2)\s+woch(?:en|e)\b/gi, ' ')
    .replace(/\b(?:leicht|mittel|mittelstark(?:e|er|en|es)?|maessig|mäßig|stark(?:e|er|en|es)?|sehr\s+stark(?:e|er|en|es)?)\b/gi, ' ')
    .replace(/\b\d{1,2}\s*(?:\/|von)\s*10\b/gi, ' ')
    .replace(/\b(?:schmerzstaerke|schmerzstärke|staerke|stärke|beschwerdestaerke|beschwerdestärke)\s*:?\s*\d{1,2}\b/gi, ' ')
    .replace(/[;,]\s*(?=[;,])/g, '')
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return cleaned.length > 0 ? cleaned : undefined
}

function isDuplicateSymptomDetail(details: string | undefined, region: string, side?: string): boolean {
  if (!details) {
    return false
  }

  const normalizedDetails = normalizeLabel(details)
  const normalizedRegion = normalizeLabel(region)
  const normalizedSide = side ? normalizeLabel(side) : undefined

  return (
    normalizedDetails === normalizedRegion ||
    normalizedDetails === `${normalizedRegion}schmerz` ||
    normalizedDetails === `${normalizedRegion}schmerzen` ||
    normalizedDetails === normalizedSide ||
    (normalizedSide !== undefined && (
      normalizedDetails === `${normalizedSide}schmerz` ||
      normalizedDetails === `${normalizedSide}schmerzen`
    ))
  )
}

export const extractedSymptomSchema = z
  .object({
    region: z.string().min(1),
    side: z.preprocess(emptyStringOrNullToUndefined, z.string().min(1).optional()),
    details: z.preprocess(emptyStringOrNullToUndefined, z.string().min(1).optional()),
    measurementType: z
      .preprocess(emptyStringOrNullToUndefined, z.enum(SYMPTOM_MEASUREMENT_TYPES).optional())
      .catch(undefined),
    measurementValue: z
      .preprocess(normalizeMeasurementValue, z.number().optional())
      .catch(undefined),
    duration: z
      .preprocess(emptyStringOrNullToUndefined, z.enum(TRIAGE_SYMPTOM_DURATIONS).optional())
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
    const hasInvalidTemperatureMeasurement = value.measurementType === 'temperature' && !isFeverSymptom(region, side)
    const measurementType = hasInvalidTemperatureMeasurement ? 'pain' : value.measurementType
    const measurementValue = hasInvalidTemperatureMeasurement ? undefined : value.measurementValue
    const normalizedDetails = normalizeDetails(value.details)
    const details = isDuplicateSymptomDetail(normalizedDetails, region, side)
      ? undefined
      : normalizedDetails
    const symptom = { ...value }
    delete symptom.measurementType
    delete symptom.measurementValue
    delete symptom.details

    return {
      ...symptom,
      region,
      ...(side ? { side } : {}),
      ...(details ? { details } : {}),
      ...(measurementType ? { measurementType } : {}),
      ...(measurementValue !== undefined ? { measurementValue } : {}),
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
