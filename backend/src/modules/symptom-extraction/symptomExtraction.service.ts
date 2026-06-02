import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import type { SymptomMeasurementType, TriageSymptom } from '../../../../shared/symptom.types.js'
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

const MEASUREMENT_CUE_PATTERNS: Record<SymptomMeasurementType, RegExp> = {
  pain: /\b([1-9]|10)\s*(?:\/\s*10|von\s*10)|\b(leicht|mittel|maessig|massig|moderat|stark|heftig|schlimm|intensiv|unertraeglich)\w*\b/,
  severity: /\b([1-9]|10)\s*(?:\/\s*10|von\s*10)|\b(leicht|mittel|maessig|massig|moderat|stark|heftig|schlimm|intensiv|unertraeglich)\w*\b/,
  feeling: /\b([1-9]|10)\s*(?:\/\s*10|von\s*10)|\b(leicht|mittel|maessig|massig|moderat|stark|heftig|schlimm|intensiv|unertraeglich)\w*\b/,
  temperature: /\b(?:3[5-9]|4[0-3])(?:[,.]\d)?\s*(?:grad|c|°c)?\b|\bfieber\b/,
}

function hasMeasurementCue(text: string, measurementType?: SymptomMeasurementType): boolean {
  if (!measurementType) {
    return false
  }

  return MEASUREMENT_CUE_PATTERNS[measurementType].test(normalizeText(text))
}

function sanitizeExtractedSymptoms(text: string, symptoms: TriageSymptom[]): TriageSymptom[] {
  return symptoms.map((symptom) => {
    if (symptom.measurementValue === undefined || hasMeasurementCue(text, symptom.measurementType)) {
      return symptom
    }

    const { measurementValue, ...symptomWithoutInferredValue } = symptom
    return symptomWithoutInferredValue
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
    modelStrategy: 'fallback-only',
  })
}

async function requestSymptomsFromAi(text: string, inputType: SymptomInputType) {
  // Bekannte Symptome werden normalisiert; unbekannte medizinische Beschwerden bleiben als Freitext-Symptom erhalten.
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
    modelStrategy: 'fallback-only',
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
    symptoms: sanitizeExtractedSymptoms(text, result.symptoms),
  }
}
