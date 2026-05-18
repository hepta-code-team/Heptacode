import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import type {
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

  if (parsed.careLevel !== 'specialist') {
    return {
      ...parsed,
      recommendedSpecialty: undefined,
    }
  }

  return parsed
}

// Fallback fuer strukturierte Symptome: Ohne KI wird anhand der staerksten Schmerzangabe entschieden.
// Der Fallback ist bewusst vorsichtig, damit im Zweifel eher aerztlich abgeklaert wird.
function createFallbackTriage(symptoms: TriageSymptom[]): TriageResponse {
  const strongestPainLevel = Math.max(
    0,
    ...symptoms.map((symptom) => symptom.painLevel ?? 0),
  )

  if (strongestPainLevel >= 8) {
    return {
      careLevel: 'emergency',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Aufgrund der sehr starken Beschwerden wird sicherheitshalber eine Notfallabklaerung empfohlen.',
      ],
      aiUnavailable: true,
    }
  }

  if (strongestPainLevel >= 5 || symptoms.length > 0) {
    return {
      careLevel: 'doctor',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Bitte lassen Sie die Beschwerden aerztlich einschaetzen, besonders bei Verschlechterung oder anhaltenden Symptomen.',
      ],
      aiUnavailable: true,
    }
  }

  return {
    careLevel: 'selfcare',
    reasons: ['Die KI-Auswertung ist aktuell nicht verfuegbar. Ohne erkannte Symptome ist keine hoehere Dringlichkeit ableitbar.'],
    aiUnavailable: true,
  }
}

// Spezieller Fallback fuer Freitext: Wenn die KI keine Symptome extrahieren kann,
// ist eine sichere Selfcare-Einstufung nicht moeglich.
function createTextExtractionFallbackTriage(): TriageResponse {
  return {
    careLevel: 'doctor',
    reasons: [
      'Die KI-Auswertung ist aktuell nicht verfuegbar.',
      'Die Freitext-Beschreibung konnte nicht sicher in Symptome ueberfuehrt werden. Bitte waehlen Sie die Symptome manuell aus oder lassen Sie die Beschwerden aerztlich einschaetzen.',
    ],
    aiUnavailable: true,
  }
}

// Wrapper fuer den KI-Call: bekannte KI-Ausfaelle werden abgefangen, echte Programmierfehler nicht.
async function requestTriageWithFallback(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  try {
    return await requestTriageFromAi(patientData, symptoms)
  } catch (error) {
    // Nur Timeout/API/Antwortformat-Fehler loesen den medizinischen Fallback aus.
    if (!isAiRequestError(error)) {
      throw error
    }

    return createFallbackTriage(symptoms)
  }
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

    if (extractionResult.aiUnavailable) {
      return createTextExtractionFallbackTriage()
    }

    return requestTriageWithFallback(patientData, extractionResult.symptoms)
  }

  const triageSymptoms = symptoms ?? []

  if (triageSymptoms.length === 0) {
    // Ohne Symptome bleibt die Empfehlung bei Selfcare, ohne dass ein KI-Call noetig ist.
    return {
      careLevel: 'selfcare',
      reasons: [],
    }
  }

  return requestTriageWithFallback(patientData, triageSymptoms)
}
