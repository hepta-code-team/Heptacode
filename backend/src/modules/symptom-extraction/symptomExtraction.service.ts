import { zodResponseFormat } from 'openai/helpers/zod'
import { aiClient } from '../../ai/client.js'
import { env } from '../../config/env.js'
import type { SymptomExtractionResponse } from './symptomExtraction.types.js'
import {
  symptomExtractionAiResultSchema,
  symptomInputValidationAiResultSchema,
} from './symptomExtraction.types.js'

const symptomExtractionInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du extrahierst aus deutschem medizinischem Freitext bis zu drei Beschwerden in Erwähnungsreihenfolge.',
  'Gib ausschließlich Beschwerden zurück, die auf die vorhandenen Frontend-Optionen passen.',
  'Wenn im Text eine Schmerzintensität genannt wird, gib sie als painLevel mit einer ganzen Zahl von 1 bis 10 zurück.',
  'Wenn keine Schmerzintensität genannt wird oder die Beschwerde keine Schmerzangabe hat, lasse painLevel weg.',
  'Wenn im Text eine Dauer genannt wird, gib sie als duration mit genau einer dieser vier Optionen zurück: today, days, week, weeks.',
  'Ordne die Dauer so zu: today = Seit heute, days = Seit ein paar Tagen, week = Seit einer Woche, weeks = Seit mehr als 2 Wochen.',
  'Wenn keine Dauer genannt wird oder sie nicht sicher zuordenbar ist, lasse duration weg.',
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
  'Übernimm keine Dauer, Temperatur oder andere Messwerte in painLevel.',
  'Erfinde nichts. Wenn kein passendes Symptom erkennbar ist, gib eine leere Liste zurück.',
].join('\n')

const symptomValidationInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du bewertest, ob ein deutscher Freitext eine sinnvolle medizinische Beschreibung von Beschwerden enthält.',
  'Ungültig sind insbesondere Buchstabensalat, Songtexte, Gedichte, themenfremde Fragen, allgemeiner Smalltalk und sonstige nicht-medizinische Inhalte.',
  'Gültig sind Texte, die erkennbare gesundheitliche Beschwerden, Symptome oder relevante medizinische Kontexte beschreiben.',
  'Antworte nur mit dem vorgegebenen JSON-Format.',
].join('\n')

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
  const completion = await aiClient.beta.chat.completions.parse({
    model: env.aiModel,
    messages: [
      { role: 'system', content: symptomValidationInstructions },
      {
        role: 'user',
        content: `Input-Typ: ${inputType}\nFreitext: ${text}`,
      },
    ],
    response_format: zodResponseFormat(
      symptomInputValidationAiResultSchema,
      'symptom_input_validation_result',
    ),
    temperature: 0,
  })

  const parsed = completion.choices[0]?.message.parsed

  if (!parsed) {
    // Fehlende strukturierte Ausgabe wird als Integration-Fehler behandelt.
    throw new Error('AI symptom input validation returned no structured result')
  }

  return parsed
}

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
    // Fehlende strukturierte Ausgabe wird als Integration-Fehler behandelt.
    throw new Error('AI symptom extraction returned no structured result')
  }

  return parsed
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

  const validationResult = await requestInputValidationFromAi(text, inputType)

  if (!validationResult.isValidMedicalInput) {
    return {
      text,
      inputType,
      symptoms: [],
      invalidInput: true,
      message: validationResult.reason,
    }
  }

  const result = await requestSymptomsFromAi(text, inputType)

  return {
    text,
    inputType,
    symptoms: result.symptoms,
  }
}
