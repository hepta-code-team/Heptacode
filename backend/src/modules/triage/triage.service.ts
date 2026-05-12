import { zodResponseFormat } from 'openai/helpers/zod'
import { aiClient } from '../../ai/client.js'
import { env } from '../../config/env.js'
import type {
  CareLevel,
  PatientData,
  TriageResponse,
  TriageSymptom,
} from './triage.types.js'
import { triageAiResultSchema } from './triage.types.js'

// Konstante für die Dauer-Labels
const DURATION_LABELS: Record<NonNullable<TriageSymptom['duration']>, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

// Prompt von ChatGPT erstellt:
const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
  'Erlaubte careLevel-Werte sind ausschließlich: emergency, doctor, selfcare.',
  'Berücksichtige die übergebenen Symptome, optionale Schmerzintensitäten, Dauern und die Stammdaten.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko wähle die höhere Versorgungsebene.',
  'Gib kurze, konkrete Begründungen auf Deutsch zurück.',
  'Erfinde keine zusätzlichen Symptome oder Stammdaten.',
].join('\n')

// Funktion um die Patientendaten zu formatieren
function formatPatientData(patientData?: PatientData): string {
  if (!patientData) {
    return 'Keine Stammdaten übergeben.'
  }

  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Größe: ${patientData.height}`,
    `Gewicht: ${patientData.weight}`,
    `Geschlecht: ${patientData.gender}`,
    `Schwanger: ${patientData.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillend: ${patientData.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${patientData.allergies || 'Keine Angabe'}`,
    `Medikamente: ${patientData.medications || 'Keine Angabe'}`,
    `Substanzbeeinflussung: ${patientData.substanceInfluence || 'Keine Angabe'}`,
    `Auslandsaufenthalt: ${patientData.recentAbroad ? patientData.recentAbroadDetails || 'Ja' : 'Nein'}`,
    `Vorerkrankungen: ${patientData.conditions.length > 0 ? patientData.conditions.join(', ') : 'Keine Angabe'}`,
  ].join('\n')
}

// Funktion um die Symptome zu formatieren
function formatSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome übergeben.'
  }

  return symptoms
    .map((symptom, index) => {
      const parts = [
        symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region,
        symptom.painLevel !== undefined ? `Schmerzstärke ${symptom.painLevel}/10` : null,
        symptom.duration ? DURATION_LABELS[symptom.duration] : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${parts.join(', ')}`
    })
    .join('\n')
}

// Funktion um die Versorgungsebene vom AI zu requesten
async function requestTriageFromAi(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<{ careLevel: CareLevel; reasons: string[] }> {
  // Die KI erhält bereits strukturierte Eingaben und muss nur noch die Versorgungsebene bewerten.
  const completion = await aiClient.beta.chat.completions.parse({
    model: env.aiModel,
    messages: [
      { role: 'system', content: triageInstructions },
      {
        role: 'user',
        content: [
          'Stammdaten:',
          formatPatientData(patientData),
          '',
          'Symptome:',
          formatSymptoms(symptoms),
        ].join('\n'),
      },
    ],
    response_format: zodResponseFormat(triageAiResultSchema, 'triage_result'),
    temperature: 0,
  })

  const parsed = completion.choices[0]?.message.parsed

  if (!parsed) {
    // Fehlende strukturierte Ausgabe wird als Integrationsfehler behandelt.
    throw new Error('AI triage returned no structured result')
  }

  return parsed
}

// Funktion um die Versorgungsebene zu evaluieren
export async function evaluateTriage(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
  emergencyFromLanding?: boolean,
): Promise<TriageResponse> {
  if (emergencyFromLanding) {
    return {
      careLevel: 'emergency',
      reasons: ['Notfallmodus über die Startseite ausgewählt.'],
    }
  }

  if (symptoms.length === 0) {
    return {
      careLevel: 'selfcare',
      reasons: [],
    }
  }

  return requestTriageFromAi(patientData, symptoms)
}
