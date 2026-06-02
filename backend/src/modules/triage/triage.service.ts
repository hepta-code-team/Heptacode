import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import type {
  CareLevel,
  MedicalSpecialty,
  PatientData,
  RecommendedSpecialtyItem,
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

const SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  home_care: 'Häusliche Versorgung',
  emergency_medicine: 'Notfallmedizin',
  general_practice: 'Hausarzt',
  internal_medicine: 'Innere Medizin',
  cardiology: 'Kardiologie',
  neurology: 'Neurologie',
  orthopedics: 'Orthopädie',
  gastroenterology: 'Gastroenterologie',
  pulmonology: 'Pneumologie',
  dermatology: 'Dermatologie',
  urology: 'Urologie',
  gynecology: 'Gynäkologie',
  psychiatry: 'Psychiatrie',
  pediatrics: 'Pädiatrie',
  dentistry: 'Zahnmedizin',
  ophthalmology: 'Augenheilkunde',
  otolaryngology: 'HNO',
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function buildPatientDataLines(patientData?: PatientData): string[] {
  if (!patientData) {
    return ['Keine Stammdaten uebergeben.']
  }

  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height}`,
    `Gewicht: ${patientData.weight}`,
    `Geschlecht: ${patientData.gender}`,
    patientData.isPregnant ? 'Schwanger: Ja' : null,
    patientData.isBreastfeeding ? 'Stillend: Ja' : null,
    hasText(patientData.allergies) ? `Allergien: ${patientData.allergies.trim()}` : null,
    hasText(patientData.medications) ? `Medikamente: ${patientData.medications.trim()}` : null,
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    patientData.recentAbroad
      ? `Auslandsaufenthalt: ${hasText(patientData.recentAbroadDetails) ? patientData.recentAbroadDetails.trim() : 'Ja'}`
      : null,
    patientData.conditions.length > 0
      ? `Vorerkrankungen: ${patientData.conditions.join(', ')}`
      : null,
  ].filter((line): line is string => line !== null)
}

// Funktion um die Patientendaten fuer die KI zu formatieren
function formatPatientData(patientData?: PatientData): string {
  return buildPatientDataLines(patientData).join('\n')
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

  if (recommendedSpecialty === 'general_practice') {
    return 'doctor'
  }

  return 'specialist'
}

function inferSpecialistFromSymptoms(symptoms: TriageSymptom[]): MedicalSpecialty | undefined {
  const primary = symptoms[0]

  if (!primary) {
    return undefined
  }

  if (primary.region === 'Psychische Probleme') {
    return 'psychiatry'
  }

  if (primary.region === 'Verbrennung') {
    return 'dermatology'
  }

  if (primary.region === 'Kopf' && (primary.painLevel ?? 0) >= 5) {
    return 'neurology'
  }

  if (primary.region === 'Bauch' && (primary.painLevel ?? 0) >= 5) {
    return 'gastroenterology'
  }

  if (primary.region === 'Rücken' || primary.region === 'Arme' || primary.region === 'Beine') {
    return 'orthopedics'
  }

  if (primary.region === 'Brust') {
    if (primary.side === 'Atemabhängig') {
      return 'pulmonology'
    }

    return 'cardiology'
  }

  return undefined
}

function normalizeTriageResult(
  result: TriageResponse,
  symptoms: TriageSymptom[],
): TriageResponse {
  if (result.careLevel === 'emergency') {
    return {
      ...result,
      recommendedSpecialty: 'emergency_medicine',
    }
  }

  if (result.careLevel === 'selfcare') {
    return {
      ...result,
      recommendedSpecialty: 'home_care',
    }
  }

  if (result.careLevel === 'specialist') {
    const specialist =
      toCareLevel(result.recommendedSpecialty) === 'specialist'
        ? result.recommendedSpecialty
        : inferSpecialistFromSymptoms(symptoms) ?? 'internal_medicine'

    return {
      ...result,
      recommendedSpecialty: specialist,
    }
  }

  if (toCareLevel(result.recommendedSpecialty) === 'specialist') {
    return {
      ...result,
      careLevel: 'specialist',
    }
  }

  return {
    ...result,
    recommendedSpecialty: 'general_practice',
  }
}

function applySpecialistEscalation(
  result: TriageResponse,
  symptoms: TriageSymptom[],
): TriageResponse {
  if (result.careLevel !== 'doctor' || result.recommendedSpecialty !== 'general_practice') {
    return result
  }

  const inferredSpecialist = inferSpecialistFromSymptoms(symptoms)
  const primary = symptoms[0]

  if (!inferredSpecialist || !primary) {
    return result
  }

  const isPersistent = primary.duration === 'days' || primary.duration === 'week' || primary.duration === 'weeks'
  const isPronounced = (primary.painLevel ?? 0) >= 5

  if (!isPersistent && !isPronounced) {
    return result
  }

  return {
    ...result,
    careLevel: 'specialist',
    recommendedSpecialty: inferredSpecialist,
  }
}

function buildRecommendedSpecialties(result: TriageResponse): RecommendedSpecialtyItem[] | undefined {
  if (toCareLevel(result.recommendedSpecialty) !== 'specialist') {
    return undefined
  }

  return [
    {
      specialty: result.recommendedSpecialty,
      label: SPECIALTY_LABELS[result.recommendedSpecialty],
      reason:
        result.reasons[0] ??
        `Aufgrund Ihrer Angaben ist eine fachärztliche Abklärung in ${SPECIALTY_LABELS[result.recommendedSpecialty]} sinnvoll.`,
      priority: 1,
    },
  ]
}

function attachPresentationFields(result: TriageResponse): TriageResponse {
  const recommendedSpecialties = buildRecommendedSpecialties(result)

  return {
    ...result,
    ...(recommendedSpecialties ? { recommendedSpecialties } : {}),
  }
}

// Funktion um Versorgungsebene, Fachrichtung und Review Summary vom AI zu requesten
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
    schemaName: 'triage_ai_response',
    temperature: 0,
  })

  return attachPresentationFields(
    applySpecialistEscalation(normalizeTriageResult(parsed, symptoms), symptoms),
  )
}

// Fallback fuer strukturierte Symptome: Ohne KI wird anhand der staerksten Schmerzangabe entschieden.
// Der Fallback ist bewusst vorsichtig, damit im Zweifel eher aerztlich abgeklaert wird.
function createFallbackTriage(symptoms: TriageSymptom[]): TriageResponse {
  const strongestPainLevel = Math.max(
    0,
    ...symptoms.map((symptom) => symptom.painLevel ?? 0),
  )
  const hasEmergencyPattern = symptoms.some((symptom) => {
    const region = symptom.region.toLowerCase()
    const side = symptom.side?.toLowerCase() ?? ''
    const painLevel = symptom.painLevel ?? 0

    if (region === 'psychische probleme' && side === 'suizidgedanken') {
      return true
    }

    if (region === 'allgemein' && side === 'verwirrtheit') {
      return true
    }

    if (region === 'brust') {
      return (
        painLevel >= 5 ||
        side === 'linksseitig' ||
        side === 'brustmitte' ||
        side === 'atemabhaengig'
      )
    }

    return false
  })

  if (hasEmergencyPattern) {
    return {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Die uebergebenen Beschwerden enthalten ein Warnmuster, das vorsichtshalber als Notfall eingestuft wird.',
      ],
      aiUnavailable: true,
    }
  }

  if (strongestPainLevel >= 8) {
    return {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
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
      recommendedSpecialty: 'general_practice',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Bitte lassen Sie die Beschwerden aerztlich einschaetzen, besonders bei Verschlechterung oder anhaltenden Symptomen.',
      ],
      aiUnavailable: true,
    }
  }

  return {
    careLevel: 'selfcare',
    recommendedSpecialty: 'home_care',
    reasons: ['Die KI-Auswertung ist aktuell nicht verfuegbar. Ohne erkannte Symptome ist keine hoehere Dringlichkeit ableitbar.'],
    aiUnavailable: true,
  }
}

// Spezieller Fallback fuer Freitext: Wenn die KI keine Symptome extrahieren kann,
// ist eine sichere Selfcare-Einstufung nicht moeglich.
function createTextExtractionFallbackTriage(): TriageResponse {
  return {
    careLevel: 'doctor',
    recommendedSpecialty: 'general_practice',
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
    const result: TriageResponse = {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
      reviewSummary: {
        plainLanguage:
          'Es wurde ein Notfallsymptom auf der Startseite ausgewaehlt. Bitte nehmen Sie umgehend medizinische Hilfe in Anspruch.',
        professionalSummary:
          'Notfallmodus ueber die Startseite ausgewaehlt. Care Level: Notfallversorgung. Empfohlene Fachrichtung: emergency_medicine.',
      },
    }

    return attachPresentationFields(result)
  }

  // Wenn Freitext uebergeben wurde, wird zuerst die Symptom-Extraktion ausgefuehrt und deren Ergebnis fuer die Triage verwendet.
  if (text) {
    const extractionResult = await extractSymptoms(text, inputType)

    if (extractionResult.invalidInput) {
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
    return {
      careLevel: 'selfcare',
      recommendedSpecialty: 'home_care',
      reasons: [],
      reviewSummary: {
        plainLanguage:
          'Es wurden keine konkreten Beschwerden uebergeben. Eine medizinische Ersteinschaetzung ist dadurch nur eingeschraenkt moeglich.',
        professionalSummary:
          'Keine Symptome uebergeben. Care Level: Selbstversorgung. Empfohlene Fachrichtung: home_care.',
      },
    }
  }

  return requestTriageWithFallback(patientData, triageSymptoms)
}
