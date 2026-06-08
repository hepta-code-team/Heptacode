import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
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

/**
 * Rejects obvious nonsense before calling the AI.
 *
 * The heuristic only catches high-confidence invalid input, because medical
 * free text can be short or messy and should usually still reach AI validation.
 */
function detectHeuristicInvalidInput(text: string): string | null {
  const trimmedText = text.trim()
  const words = splitWords(text)
  const lettersOnlyText = normalizeText(text).replace(/[^a-z]/g, '')
  const uniqueLetters = new Set(lettersOnlyText.split(''))
  const hasMedicalCue = /(schmerz|weh|fieber|uebel|übel|atem|husten|kopf|bauch|brust|ruecken|rücken|angst|schwindel|krank|verletz|wunde|blut|nagel|getreten|stich|schnitt|biss|bruch|gebroch|verloren|abgetrennt|amput|fremdkoerper|fremdkörper|verschluckt|vergift)/i.test(text)

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

/**
 * Asks the AI whether the text is medically meaningful.
 *
 * This is intentionally separate from extraction so non-medical free text can be
 * rejected with a clear reason before symptom normalization runs.
 */
async function requestInputValidationFromAi(text: string, inputType: SymptomInputType) {
  // The AI only checks whether the content is medically meaningful.
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

/**
 * Extracts up to three normalized symptoms from valid free text.
 *
 * The schema accepts known taxonomy entries and free-text medical complaints so
 * uncommon symptoms are not silently discarded.
 */
async function requestSymptomsFromAi(text: string, inputType: SymptomInputType) {
  // Known symptoms are normalized; unknown medical complaints remain as free-text symptoms.
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

/**
 * Converts free text or speech transcription into structured triage symptoms.
 *
 * The flow uses cheap local validation first, then AI validation, and finally AI
 * extraction so invalid input and service outages produce different responses.
 */
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
    // If validation fails, still attempt extraction so a transient validation outage does not block the flow.
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
    // Return a controlled fallback response if extraction fails instead of surfacing a 500.
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
    symptoms: result.symptoms,
  }
}
