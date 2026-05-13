import { aiClient, aiModel } from './client.js'
import type {
  ReviewSummaryInput,
  ReviewSummaryResult,
  SymptomExtractionResult,
} from './types.js'

function readAiText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  return ''
}

// Funktion schon in symptomExtraction.service.ts verwendet (überflüssig)
export async function extractSymptoms(
  symptomText: string,
): Promise<SymptomExtractionResult> {
  const response = await aiClient.chat.completions.create({
    model: aiModel,
    temperature: 0,
    messages: [
      {
        role: 'system',
        // TODO(TA2): Das Prompting spaeter durch ein finales Prompt-Template ersetzen.
        content:
          'Du bist ein deutschsprachiger medizinischer Assistent. Extrahiere die Symptome aus dem Patiententext. Antworte auf Deutsch.',
      },
      {
        role: 'user',
        content: symptomText,
      },
    ],
  })

  const rawText = readAiText(response.choices[0]?.message?.content)

  if (!rawText) {
    throw new Error('AI returned an empty symptom extraction response')
  }

  // TODO(TA2): Die rohe KI-Antwort spaeter strukturiert parsen und validieren.
  return { rawText }
}

export async function generateReviewSummary(
  input: ReviewSummaryInput,
): Promise<ReviewSummaryResult> {
  const response = await aiClient.chat.completions.create({
    model: aiModel,
    temperature: 0,
    messages: [
      {
        role: 'system',
        // TODO(TA2): Spaeter durch ein finales Review-Summary-Prompt-Template ersetzen.
        content:
          'Du bist ein deutschsprachiger medizinischer Assistent. Erstelle eine kurze Review Summary fuer medizinisches Fachpersonal.',
      },
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  })

  const summaryText = readAiText(response.choices[0]?.message?.content)

  if (!summaryText) {
    throw new Error('AI returned an empty review summary response')
  }

  return { summaryText }
}
