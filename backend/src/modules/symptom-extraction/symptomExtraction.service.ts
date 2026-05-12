import { zodResponseFormat } from 'openai/helpers/zod'
import { aiClient } from '../../ai/client.js'
import { env } from '../../config/env.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import { symptomExtractionAiResultSchema } from './symptomExtraction.types.js'

const symptomExtractionInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du extrahierst aus deutschem medizinischem Freitext bis zu drei Beschwerden in Erwähnungsreihenfolge.',
  'Gib ausschließlich Beschwerden zurück, die auf die vorhandenen Frontend-Optionen passen.',
  'Verwende nur diese Regionen: Kopf, Brust, Rücken, Arme, Bauch, Beine, Verbrennung, Allgemein, Psychische Probleme.',
  'Verwende nur diese Seiten/Unteroptionen, wenn sie eindeutig genannt oder sicher ableitbar sind:',
  'Kopf: Stirn, Schläfen, Hinterkopf, Gesicht.',
  'Brust: Brustmitte, Linksseitig, Rechtsseitig, Rippen, Atemabhängig.',
  'Rücken: Nacken, Oberer Rücken, Mittlerer Rücken, Unterer Rücken, Steißbein.',
  'Arme: Schulter, Oberarm, Ellenbogen, Unterarm, Hand/Handgelenk, Finger.',
  'Bauch: Oberbauch, Unterbauch, Rechts oben, Rechts unten, Links oben, Links unten.',
  'Beine: Hüfte, Oberschenkel, Knie, Wade, Fuß/Knöchel, Zehen.',
  'Verbrennung: Große Fläche, Kleine Fläche, Blasenbildung.',
  'Allgemein: Fieber, Übelkeit/Schwindel, Schwäche, Verwirrtheit.',
  'Psychische Probleme: Angst/Panik, Suizidgedanken, Niedergeschlagenheit.',
  'Wenn keine Unteroption sicher ist, gib nur die Region zurück.',
  'Erfinde nichts. Wenn kein passendes Symptom erkennbar ist, gib eine leere Liste zurück.',
].join('\n')

async function requestSymptomsFromAi(text: string, inputType: 'text' | 'speech') {
  // Das model ist auf unsere feste Symptomtaxonomie beschränkt, so dass das Frontend die Ergebnis direkt verarbeiten kann.
  const completion = await aiClient.beta.chat.completions.parse({
    model: env.aiModel,
    messages: [
      { role: 'system', content: symptomExtractionInstructions },
      {
        role: 'user',
        content: `Input-Typ: ${inputType}\nFreitext: ${text}`,
      },
    ],
    response_format: zodResponseFormat(
      symptomExtractionAiResultSchema,
      'symptom_extraction_result',
    ),
    temperature: 0,
  })

  const parsed = completion.choices[0]?.message.parsed

  if (!parsed) {
    // Behandle fehlende strukturierte Ausgabe als Integration-Fehler, nicht als "keine Symptome".
    throw new Error('AI symptom extraction returned no structured result')
  }

  return parsed
}

export async function extractSymptoms(
  text: string,
  inputType: 'text' | 'speech' = 'text',
): Promise<SymptomExtractionResponse> {
  const result = await requestSymptomsFromAi(text, inputType)

  return {
    text,
    inputType,
    symptoms: result.symptoms,
  }
}
