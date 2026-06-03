import { requestStructuredAiResponseWithModel } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import type {
  PatientData,
  TriageResponse,
  TriageSymptom,
} from './triage.types.js'
import { triageAiResponseSchema } from '../../shared/validation.js'
import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'
import { triageInstructions, createTriagePrompt } from '../prompt/triage.prompt.js'

function createBadRequestError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = 400
  return error
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

function buildPatientDataLines(patientData?: PatientData): string[] {
  if (!patientData) {
    return ['Keine Stammdaten uebergeben.']
  }

  const conditionDetails = Object.entries(patientData.conditionDetails)
    .filter(([, detail]) => hasText(detail))
    .map(([condition, detail]) => `${condition}: ${detail.trim()}`)

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

function formatPatientData(patientData?: PatientData): string {
  return buildPatientDataLines(patientData).join('\n')
}

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

function formatSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome uebergeben.'
  }

  return symptoms
    .map((symptom, index) => {
      const parts = [
        symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region,
        formatMeasurement(symptom),
        symptom.duration ? DURATION_LABELS[symptom.duration] : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${parts.join(', ')}`
    })
    .join('\n')
}

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

async function requestTriageFromAi(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  const { data: parsed, model } = await requestStructuredAiResponseWithModel({
    messages: [
      { role: 'system', content: triageInstructions },
      {
        role: 'user',
        content: createTriagePrompt({
        patientDataText: formatPatientData(patientData),
        symptomsText: formatSymptoms(symptoms),
      }),
      },
    ],
    schema: triageAiResponseSchema,
    schemaName: 'triage_result',
    temperature: 0,
  })

  return {
    ...parsed,
    aiModel: model,
  }
}

function createFallbackTriage(symptoms: TriageSymptom[]): TriageResponse {
  const strongestMeasurementValue = Math.max(
    0,
    ...symptoms.map(getComparableMeasurementValue),
  )
  const hasEmergencyPattern = symptoms.some((symptom) => {
    const region = symptom.region.toLowerCase()
    const side = symptom.side?.toLowerCase() ?? ''
    const measurementValue = getComparableMeasurementValue(symptom)

    if (region === 'psychische probleme' && side === 'suizidgedanken') {
      return true
    }

    if (region === 'allgemein' && side === 'verwirrtheit') {
      return true
    }

    if (region === 'brust') {
      return (
        measurementValue >= 5 ||
        side === 'linksseitig' ||
        side === 'brustmitte' ||
        side === 'atemabhaengig' ||
        side === 'atemabhängig'
      )
    }

    return false
  })

  if (hasEmergencyPattern) {
    return {
      careLevel: 'emergency',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Die uebergebenen Beschwerden enthalten ein Warnmuster, das vorsichtshalber als Notfall eingestuft wird.',
      ],
      aiUnavailable: true,
    }
  }

  if (strongestMeasurementValue >= 8) {
    return {
      careLevel: 'emergency',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Aufgrund der sehr starken Beschwerden wird sicherheitshalber eine Notfallabklaerung empfohlen.',
      ],
      aiUnavailable: true,
    }
  }

  if (strongestMeasurementValue >= 5 || symptoms.length > 0) {
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

export async function evaluateTriage(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[] | undefined,
  emergencyFromLanding?: boolean,
  text?: string,
  inputType: SymptomInputType = 'text',
): Promise<TriageResponse> {
  if (emergencyFromLanding) {
    const result: TriageResponse = {
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
      reviewSummary: {
        plainLanguage:
          'Es wurde ein Notfallsymptom auf der Startseite ausgewaehlt. Bitte nehmen Sie umgehend medizinische Hilfe in Anspruch.',
        professionalSummary:
          'Notfallmodus ueber die Startseite ausgewaehlt. Care Level: Notfallversorgung.',
      },
    }

    return result
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

    return requestTriageWithFallback(patientData, extractionResult.symptoms)
  }

  const triageSymptoms = symptoms ?? []

  if (triageSymptoms.length === 0) {
    return {
      careLevel: 'selfcare',
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
