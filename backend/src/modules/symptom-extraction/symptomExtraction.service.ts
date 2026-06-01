import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import type { TriageSymptom, TriageSymptomDuration } from '../../../../shared/symptom.types.js'
import {
  symptomExtractionAiResultSchema,
  symptomInputValidationAiResultSchema,
} from './symptomExtraction.types.js'
import {
  createSymptomExtractionPrompt,
  createSymptomValidationPrompt,
  symptomExtractionInstructions,
  symptomValidationInstructions,
} from '../prompt/symptomExtraction.prompt.js'


function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .trim()
}

function splitWords(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 0)
}

function inferExplicitScaleValue(text: string): number | null {
  const normalizedText = normalizeText(text)
  const scaleMatch = normalizedText.match(/\b(10|[1-9])\s*(?:\/|von)\s*10\b/)
  const labeledMatch = normalizedText.match(/\b(?:schmerz(?:staerke)?|staerke|intensitaet)\s*(?:ist|von|:)?\s*(10|[1-9])\b/)
  const rawValue = scaleMatch?.[1] ?? labeledMatch?.[1]

  return rawValue ? Number(rawValue) : null
}

function inferPainLevel(text: string): number | null {
  const explicitScaleValue = inferExplicitScaleValue(text)

  if (explicitScaleValue !== null) {
    return explicitScaleValue
  }

  const normalizedText = normalizeText(text)

  if (/\b(?:stark|starke|starken|starker|heftig|heftige|heftigen|schlimm|schlimme|schlimmen)\b/.test(normalizedText)) {
    return 8
  }

  if (/\b(?:leicht|leichte|leichten|leichter|mild|milde|milden)\b/.test(normalizedText)) {
    return 3
  }

  return 5
}

function inferDuration(text: string): TriageSymptomDuration | null {
  const normalizedText = normalizeText(text)

  if (
    /\b(?:seit|ueber)\s+(?:mehreren|einigen|vielen|mehrere|einige|viele|paar)\s+wochen\b/.test(normalizedText)
    || /\bmehr\s+als\s+(?:2|zwei)\s+wochen\b/.test(normalizedText)
    || /\b(?:wochenlang|seit\s+wochen|ueber\s+wochen)\b/.test(normalizedText)
    || /\bseit\s+(?:1[4-9]|[2-9][0-9])\s+tagen\b/.test(normalizedText)
  ) {
    return 'weeks'
  }

  if (
    /\bseit\s+(?:einer|1)\s+woche\b/.test(normalizedText)
    || /\bseit\s+(?:7|8|9|10|11|12|13)\s+tagen\b/.test(normalizedText)
  ) {
    return 'week'
  }

  if (
    /\bseit\s+(?:mehreren|einigen|paar|wenigen|mehrere|einige|wenige|2|3|4|5|6|zwei|drei|vier|fuenf|sechs)\s+tagen\b/.test(normalizedText)
    || /\b(?:ein\s+paar|mehrere|einige|wenige)\s+tage\b/.test(normalizedText)
    || /\b(?:seit\s+gestern|gestern)\b/.test(normalizedText)
  ) {
    return 'days'
  }

  if (/\b(?:seit\s+heute|heute|seit\s+1\s+tag|seit\s+einem\s+tag)\b/.test(normalizedText)) {
    return 'today'
  }

  return null
}

function isPainLikeSymptom(symptom: TriageSymptom): boolean {
  if (symptom.measurementType === 'pain') {
    return true
  }

  if (symptom.measurementType || symptom.region === 'Allgemein' || symptom.region === 'Psychische Probleme') {
    return false
  }

  return true
}

function normalizeExtractedSymptoms(text: string, symptoms: TriageSymptom[]): TriageSymptom[] {
  const inferredDuration = inferDuration(text)
  const inferredPainLevel = inferPainLevel(text)

  return symptoms.map((symptom) => {
    const normalizedSymptom: TriageSymptom = { ...symptom }

    if (inferredDuration) {
      normalizedSymptom.duration = inferredDuration
    }

    if (isPainLikeSymptom(normalizedSymptom) && inferredPainLevel !== null && normalizedSymptom.measurementValue === undefined) {
      normalizedSymptom.measurementType = 'pain'
      normalizedSymptom.measurementValue = inferredPainLevel
    }

    return normalizedSymptom
  })
}

// Offensichtlicher Unsinn wird ohne KI-Aufruf abgefangen, um Kosten und Latenz zu sparen.
function detectHeuristicInvalidInput(text: string): string | null {
  const trimmedText = text.trim()
  const words = splitWords(text)
  const lettersOnlyText = normalizeText(text).replace(/[^a-z]/g, '')
  const uniqueLetters = new Set(lettersOnlyText.split(''))
  const hasMedicalCue = /(schmerz|weh|fieber|uebel|übel|atem|husten|kopf|bauch|brust|ruecken|rücken|angst|schwindel|krank)/i.test(text)

  if (trimmedText.length < 6) {
    return 'Bitte beschreiben Sie Ihre Beschwerden etwas genauer.'
  }

  if (words.length < 2 && !hasMedicalCue) {
    return 'Bitte geben Sie einen zusammenhängenden medizinischen Freitext ein.'
  }

  if (lettersOnlyText.length >= 12 && uniqueLetters.size <= 5 && !hasMedicalCue) {
    return 'Der Text wirkt nicht wie eine verständliche Beschreibung von Beschwerden.'
  }

  if (words.length === 1 && words[0] && words[0].length >= 12 && !hasMedicalCue) {
    return 'Der Text wirkt nicht wie eine verständliche Beschreibung von Beschwerden.'
  }

  const punctuationOnly = trimmedText.replace(/[0-9\s\p{P}]/gu, '').length === 0
  if (punctuationOnly) {
    return 'Bitte beschreiben Sie konkrete gesundheitliche Beschwerden.'
  }

  return null
}

async function requestInputValidationFromAi(text: string, inputType: SymptomInputType) {
  // Die KI prüft hier nur, ob der Inhalt überhaupt medizinisch sinnvoll ist.
  return requestStructuredAiResponse({
    messages: [
      { role: 'system', content: symptomValidationInstructions },
      {
        role: 'user',
        content: createSymptomValidationPrompt({ text, inputType }),
      },
    ],
    schema: symptomInputValidationAiResultSchema,
    schemaName: 'symptom_input_validation_result',
    temperature: 0,
  })
}

async function requestSymptomsFromAi(text: string, inputType: SymptomInputType) {
  // Das model ist auf unsere feste Symptomtaxonomie beschränkt, so dass das Frontend die Ergebnis direkt verarbeiten kann.
  return requestStructuredAiResponse({
    messages: [
      { role: 'system', content: symptomExtractionInstructions},
      {
        role: 'user',
        content: createSymptomExtractionPrompt({ text, inputType }),
      },
    ],
    schema: symptomExtractionAiResultSchema,
    schemaName: 'symptom_extraction_result',
    temperature: 0,
  })
}

export async function extractSymptoms(
  text: string,
  inputType: SymptomInputType = 'text',
): Promise<SymptomExtractionResponse> {
  const heuristicInvalidReason = detectHeuristicInvalidInput(text)

  if (heuristicInvalidReason) {
    return {
      text,
      inputType,
      symptoms: [],
      invalidInput: true,
      message: heuristicInvalidReason,
    }
  }

  let validationResult: Awaited<ReturnType<typeof requestInputValidationFromAi>> | null = null

  try {
    validationResult = await requestInputValidationFromAi(text, inputType)
  } catch (error) {
    // TA 1.8: Wenn nur die Validierungs-KI ausfaellt, versuchen wir trotzdem die Extraktion.
    if (!isAiRequestError(error)) {
      throw error
    }
  }

  if (validationResult && !validationResult.isValidMedicalInput) {
    return {
      text,
      inputType,
      symptoms: [],
      invalidInput: true,
      message: validationResult.reason,
    }
  }

  let result: Awaited<ReturnType<typeof requestSymptomsFromAi>>

  try {
    result = await requestSymptomsFromAi(text, inputType)
  } catch (error) {
    // TA 1.8: Wenn die Extraktion ausfaellt, antwortet die API kontrolliert statt mit 500.
    if (!isAiRequestError(error)) {
      throw error
    }

    return {
      text,
      inputType,
      symptoms: [],
      aiUnavailable: true,
      message: 'Die KI-Auswertung ist aktuell nicht verfuegbar. Bitte versuchen Sie es erneut oder waehlen Sie Symptome manuell aus.',
    }
  }

  return {
    text,
    inputType,
    symptoms: normalizeExtractedSymptoms(text, result.symptoms),
  }
}
