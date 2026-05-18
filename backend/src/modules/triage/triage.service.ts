import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import type {
  CareLevel,
  MedicalSpecialty,
  PatientData,
  TriageResponse,
  TriageSymptom,
} from './triage.types.js'
import { triageAiResultSchema } from './triage.types.js'
import { triageInstructions } from '../prompt/triage.prompt.js'

function createBadRequestError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = 400
  return error
}

// Konstante fuer die Dauer-Labels
const DURATION_LABELS: Record<NonNullable<TriageSymptom['duration']>, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}


// Funktion um die Patientendaten fuer die KI zu formatieren
function formatPatientData(patientData?: PatientData): string {
  if (!patientData) {
    return 'Keine Stammdaten uebergeben.'
  }

  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height}`,
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

// Funktion um die Symptome fuer die KI zu formatieren
function formatSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome uebergeben.'
  }

  return symptoms
    .map((symptom, index) => {
      const parts = [
        symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region,
        symptom.painLevel !== undefined ? `Schmerzstaerke ${symptom.painLevel}/10` : null,
        symptom.duration ? DURATION_LABELS[symptom.duration] : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${parts.join(', ')}`
    })
    .join('\n')
}

// Funktion um das empfohlene Versorgungsangebot auf die grobe Ebene abzubilden
function toCareLevel(recommendedSpecialty: MedicalSpecialty): CareLevel {
  if (recommendedSpecialty === 'emergency_medicine') {
    return 'emergency'
  }

  if (recommendedSpecialty === 'home_care') {
    return 'selfcare'
  }

  return 'doctor'
}

// Funktion um widerspruechliche KI-Antworten zwischen careLevel und Empfehlung zu vermeiden
function ensureConsistentCareLevel(result: TriageResponse): TriageResponse {
  return {
    ...result,
    careLevel: toCareLevel(result.recommendedSpecialty),
  }
}

// Funktion um Versorgungsebene und Fachrichtung vom AI zu requesten
async function requestTriageFromAi(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  // Die KI erhaelt bereits strukturierte Eingaben und muss eine validierbare JSON-Antwort liefern.
  const parsed = await requestStructuredAiResponse({
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
    schema: triageAiResultSchema,
    schemaName: 'triage_result',
    temperature: 0,
  })

  return ensureConsistentCareLevel(parsed)
}

// Funktion um die Versorgungsebene zu evaluieren
export async function evaluateTriage(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[] | undefined,
  emergencyFromLanding?: boolean,
  text?: string,
  inputType: 'text' | 'speech' = 'text',
): Promise<TriageResponse> {
  if (emergencyFromLanding) {
    return {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    }
  }

  // Wenn Freitext uebergeben wurde, wird zuerst die Symptom-Extraktion ausgefuehrt und deren Ergebnis fuer die Triage verwendet.
  if (text) {
    const extractionResult = await extractSymptoms(text, inputType)

    if (extractionResult.invalidInput) {
      // Ungueltiger Freitext soll in der Triage als Eingabefehler sichtbar werden.
      throw createBadRequestError(
        extractionResult.message ?? 'Bitte beschreiben Sie konkrete gesundheitliche Beschwerden.',
      )
    }

    return requestTriageFromAi(patientData, extractionResult.symptoms)
  }

  const triageSymptoms = symptoms ?? []

  if (triageSymptoms.length === 0) {
    // Ohne Symptome bleibt die Empfehlung bei Selfcare, ohne dass ein KI-Call noetig ist.
    return {
      careLevel: 'selfcare',
      recommendedSpecialty: 'home_care',
      reasons: [],
    }
  }

  return requestTriageFromAi(patientData, triageSymptoms)
}
