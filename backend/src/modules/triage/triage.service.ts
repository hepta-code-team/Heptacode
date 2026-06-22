import { requestStructuredAiResponseWithModel } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import { ApiError } from '../../common/errors/ApiError.js'
import { getPatientPlausibilityError } from '../../common/patientPlausibility.js'
import type {
  PatientData,
  TriageResponse,
  TriageSymptom,
} from './triage.types.js'
import { triageAiResponseSchema } from '../../shared/validation.js'
import {
  getTriageAiPlausibilityIssues,
  hasEmergencyTriagePattern,
} from '../../shared/triageAiPlausibility.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import { triageInstructions, createTriagePrompt } from '../prompt/triage.prompt.js'

export type TriageEvaluationDiagnostics = {
  aiResponse?: TriageResponse
  finalResponse: TriageResponse
  plausibilityIssues: string[]
  fallbackType: 'none' | 'plausibility' | 'availability'
}

function createBadRequestError(message: string): Error & { statusCode: number } {
  return new ApiError(400, 'BAD_REQUEST', message) as Error & { statusCode: number }
}

const DURATION_LABELS: Record<NonNullable<TriageSymptom['duration']>, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

const MEASUREMENT_LABELS: Record<NonNullable<TriageSymptom['measurementType']>, string> = {
  pain: 'Schmerzstaerke',
  temperature: 'Temperatur',
  feeling: 'Beschwerdegefuehl',
  severity: 'Schweregrad',
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function formatConditionDetail({ detail, duration }: PatientData['conditionDetails'][string]): string | null {
  const parts = [
    hasText(detail) ? detail.trim() : null,
    hasText(duration) ? `Dauer: ${duration.trim()}` : null,
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(', ') : null
}

function assertPatientDataIsPlausible(
  patientData: PatientData | undefined,
  text: string | undefined,
  symptoms: TriageSymptom[] | undefined,
): void {
  const plausibilityError = getPatientPlausibilityError(patientData, text, symptoms)

  if (plausibilityError) {
    throw createBadRequestError(plausibilityError)
  }
}

/**
 * Converts patient data into the compact text block used by the triage prompt.
 *
 * Optional risk factors are only included when they are present or clinically
 * meaningful, which keeps the prompt short without dropping relevant context.
 */
function buildPatientDataLines(patientData?: PatientData): string[] {
  if (!patientData) {
    return ['Keine Stammdaten uebergeben.']
  }

  const conditionDetails = Object.entries(patientData.conditionDetails)
    .map(([condition, detail]) => {
      const formattedDetail = formatConditionDetail(detail)
      return formattedDetail ? `${condition}: ${formattedDetail}` : null
    })
    .filter((detail): detail is string => detail !== null)

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
    hasText(patientData.medicationDuration) ? `Einahmedauer Medikamente: ${patientData.medicationDuration.trim()}` : null,
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    patientData.recentAbroad
      ? `Auslandsaufenthalt: ${hasText(patientData.recentAbroadDetails) ? patientData.recentAbroadDetails.trim() : 'Ja'}`
      : null,
    patientData.conditions.length > 0
      ? `Vorerkrankungen: ${patientData.conditions.join(', ')}`
      : null,
    patientData.isSmoker ? 'Raucher: Ja' : 'Raucher: Nein',
    patientData.isSmoker && hasText(patientData.smokingSinceYears)
      ? `Rauchdauer: ${patientData.smokingSinceYears.trim()} Jahre`
      : null,
    patientData.isSmoker && hasText(patientData.cigarettesPerDay)
      ? `Zigaretten pro Tag: ${patientData.cigarettesPerDay.trim()}`
      : null,
    conditionDetails.length > 0
      ? `Details zu Vorerkrankungen: ${conditionDetails.join('; ')}`
      : null,
  ].filter((line): line is string => line !== null)
}

function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatPatientData(patientData?: PatientData): string {
  return buildPatientDataLines(patientData).join('\n')
}

/**
 * Formats a single symptom measurement into patient-readable German text.
 *
 * Temperature uses a real unit while the other measurement types share the
 * normalized 1-10 scale used by the frontend controls.
 */
function formatMeasurement(symptom: TriageSymptom): string | null {
  if (symptom.measurementValue === undefined) {
    return null
  }

  if (symptom.measurementType === 'temperature') {
    return `Temperatur ${symptom.measurementValue}°C`
  }

  const label = symptom.measurementType ? MEASUREMENT_LABELS[symptom.measurementType] : 'Messwert'
  return `${label} ${symptom.measurementValue}/10`
}

/**
 * Builds the symptom list that is sent to the triage model.
 *
 * Each symptom is kept on its own numbered line so the model can reason about
 * multiple complaints without losing their measurement and duration context.
 */
function formatSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome uebergeben.'
  }

  return symptoms
    .map((symptom, index) => {
      const parts = [
        symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region,
        hasText(symptom.details) ? `Details: ${symptom.details.trim()}` : null,
        formatMeasurement(symptom),
        symptom.duration ? DURATION_LABELS[symptom.duration] : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${parts.join(', ')}`
    })
    .join('\n')
}

/**
 * Ensures every triage response has the fields required by presentation layers.
 *
 * Some local fallback paths only know the care level and reasons; this fills
 * reviewSummary from those reasons so callers can render consistently.
 */
function attachPresentationFields(result: TriageResponse): TriageResponse {
  if (result.reviewSummary) {
    return result
  }

  const text = result.reasons.length > 0
    ? result.reasons.join(' ')
    : `Die Einschätzung ergab das Pflegelevel ${result.careLevel}.`

  return {
    ...result,
    reviewSummary: {
      plainLanguage: text,
      professionalSummary: text,
    },
  }
}

/**
 * Converts mixed measurement types into one comparable urgency score.
 *
 * Fever is mapped onto the 1-10 severity scale so fallback decisions can compare
 * temperature-based and slider-based complaints in one place.
 */
function getComparableMeasurementValue(symptom: TriageSymptom): number {
  if (symptom.measurementValue === undefined) {
    return 0
  }

  if (symptom.measurementType === 'temperature') {
    if (symptom.measurementValue >= 40) {
      return 9
    }

    if (symptom.measurementValue >= 39) {
      return 6
    }

    return 0
  }

  return symptom.measurementValue
}

/**
 * Sends structured patient and symptom context to the AI triage model.
 *
 * The schema validation happens before the result leaves this function, so
 * downstream fallback logic only handles typed triage responses or known errors.
 */
async function requestTriageFromAiWithDiagnostics(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageEvaluationDiagnostics> {
  const { data: parsed, model } = await requestStructuredAiResponseWithModel({
    messages: [
      { role: 'system', content: triageInstructions },
      {
        role: 'user',
        content: createTriagePrompt({
          currentDateText: formatLocalDate(),
          patientDataText: formatPatientData(patientData),
          symptomsText: formatSymptoms(symptoms),
        }),
      },
    ],
    schema: triageAiResponseSchema,
    schemaName: 'triage_result',
    temperature: 0,
  })

  const normalized = triageAiResponseSchema.parse(parsed)
  const plausibilityIssues = getTriageAiPlausibilityIssues(normalized, symptoms)
  const aiResponse = {
    ...normalized,
    aiModel: model,
  }

  if (plausibilityIssues.length > 0) {
    return {
      aiResponse,
      finalResponse: createPlausibilityFallbackTriage(symptoms, plausibilityIssues),
      plausibilityIssues,
      fallbackType: 'plausibility',
    }
  }

  return {
    aiResponse,
    finalResponse: aiResponse,
    plausibilityIssues: [],
    fallbackType: 'none',
  }
}

async function requestTriageFromAi(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  const diagnostics = await requestTriageFromAiWithDiagnostics(patientData, symptoms)

  return diagnostics.finalResponse
}

/**
 * Creates a conservative local triage result when AI classification fails.
 *
 * The fallback intentionally favors higher urgency for warning patterns because
 * under-triage is riskier than asking for medical clarification.
 */
function createFallbackTriage(symptoms: TriageSymptom[]): TriageResponse {
  const strongestMeasurementValue = Math.max(
    0,
    ...symptoms.map(getComparableMeasurementValue),
  )

  const hasEmergencyPattern = symptoms.some(hasEmergencyTriagePattern)

  if (strongestMeasurementValue >= 8) {
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

  if (strongestMeasurementValue >= 5 || symptoms.length > 0) {
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

/**
 * Uses deterministic triage when an AI answer is formally valid but medically contradictory.
 */
function createPlausibilityFallbackTriage(
  symptoms: TriageSymptom[],
  issues: string[],
): TriageResponse {
  const fallback = createFallbackTriage(symptoms)

  return {
    ...fallback,
    reasons: [
      'Die KI-Antwort wurde verworfen, weil sie die Plausibilitaetspruefung nicht bestanden hat.',
      ...issues,
      ...fallback.reasons.filter((reason) => !reason.includes('KI-Auswertung ist aktuell nicht verfuegbar')),
    ],
    aiUnavailable: true,
  }
}

/**
 * Used when free-text extraction itself is unavailable.
 *
 * Without structured symptoms the service cannot safely infer a low urgency, so
 * it routes the user toward general medical clarification.
 */
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

/**
 * Wraps the AI request with a local fallback for known availability failures.
 *
 * Unknown errors are rethrown because they may indicate bugs or invalid request
 * shapes that should not be hidden behind medical fallback text.
 */
async function requestTriageWithFallback(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  try {
    return await requestTriageFromAi(patientData, symptoms)
  } catch (error) {
    if (!isAiRequestError(error)) {
      throw error
    }

    return createFallbackTriage(symptoms)
  }
}

/**
 * Exposes the normalized AI answer and the final safety-filtered response for live evaluation.
 */
export async function evaluateTriageWithDiagnostics(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageEvaluationDiagnostics> {
  assertPatientDataIsPlausible(patientData, undefined, symptoms)

  try {
    return await requestTriageFromAiWithDiagnostics(patientData, symptoms)
  } catch (error) {
    if (!isAiRequestError(error)) {
      throw error
    }

    return {
      finalResponse: createFallbackTriage(symptoms),
      plausibilityIssues: [],
      fallbackType: 'availability',
    }
  }
}

/**
 * Main triage entry point for manual symptoms, emergency shortcuts, and free text.
 *
 * The ordering matters: explicit emergency state wins first, then free-text
 * extraction, and finally already-structured symptom input.
 */
export async function evaluateTriage(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[] | undefined,
  emergencyFromLanding?: boolean,
  text?: string,
  inputType: SymptomInputType = 'text',
): Promise<TriageResponse> {
  // The landing-page emergency shortcut bypasses AI so critical symptoms never wait on external services.
  assertPatientDataIsPlausible(patientData, text, symptoms)

  if (emergencyFromLanding) {
    const result: TriageResponse = {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
      reviewSummary: {
        plainLanguage:
          'Es wurde ein Notfallsymptom auf der Startseite ausgewaehlt. Bitte nehmen Sie umgehend medizinische Hilfe in Anspruch.',
        professionalSummary:
          'Notfallmodus ueber die Startseite ausgewaehlt. Care Level: Notfallversorgung.',
      },
    }

    return attachPresentationFields(result)
  }

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

    // Free-text input is converted into structured symptoms before the shared triage path runs.
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
          'Keine Symptome uebergeben. Care Level: Selbstversorgung.',
      },
    }
  }

  return requestTriageWithFallback(patientData, triageSymptoms)
}
