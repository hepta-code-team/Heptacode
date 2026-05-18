import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import {
  symptomExtractionAiResultSchema,
  symptomInputValidationAiResultSchema,
} from './symptomExtraction.types.js'
import {
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

async function requestInputValidationFromAi(text: string, inputType: 'text' | 'speech') {
  // Die KI prüft hier nur, ob der Inhalt überhaupt medizinisch sinnvoll ist.
  return requestStructuredAiResponse({
    messages: [
      { role: 'system', content: symptomValidationInstructions },
      {
        role: 'user',
        content: `Input-Typ: ${inputType}\nFreitext: ${text}`,
      },
    ],
    schema: symptomInputValidationAiResultSchema,
    schemaName: 'symptom_input_validation_result',
    temperature: 0,
  })
}

async function requestSymptomsFromAi(text: string, inputType: 'text' | 'speech') {
  // Das model ist auf unsere feste Symptomtaxonomie beschränkt, so dass das Frontend die Ergebnis direkt verarbeiten kann.
  return requestStructuredAiResponse({
    messages: [
      { role: 'system', content: symptomExtractionInstructions },
      {
        role: 'user',
        content: `Input-Typ: ${inputType}\nFreitext: ${text}`,
      },
    ],
    schema: symptomExtractionAiResultSchema,
    schemaName: 'symptom_extraction_result',
    temperature: 0,
  })
}

export async function extractSymptoms(
  text: string,
  inputType: 'text' | 'speech' = 'text',
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
    symptoms: result.symptoms,
  }
}
