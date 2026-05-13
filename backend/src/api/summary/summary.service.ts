import { saveSummary, getSummary } from './summary.store.js'
import type {
  SummaryRequest,
  SummaryResponse,
  UrgencyLevel,
} from './summary.types.js'

export async function createSummaryService(
  data: SummaryRequest
): Promise<SummaryResponse> {
  if (!data.consent.acceptedDataProcessing) {
    throw new Error('CONSENT_REQUIRED')
  }

  const detectedRedFlags = detectRedFlags(data)
  const urgencyLevel = determineUrgencyLevel(data, detectedRedFlags)

  const summary: SummaryResponse = {
    summaryId: `summary_${Date.now()}`,
    urgencyLevel,
    humanReviewRequired: true,

    aiReviewSummary: {
      plainLanguage: createPlainLanguageSummary(data, urgencyLevel),
      professionalSummary: createProfessionalSummary(data),
      detectedRedFlags,
      missingInformation: createMissingInformationList(data),
    },

    recommendation: {
      nextStep: createNextStep(urgencyLevel),
      message: createRecommendationMessage(urgencyLevel),
    },

    fhirPreview: {
      resourceType: 'Bundle',
      type: 'collection',
      note:
        'FHIR-nahe Struktur kann später aus Patientendaten und Symptomen erzeugt werden.',
    },

    safetyNotice:
      'Diese Einschätzung ersetzt keine ärztliche Diagnose. Die finale Bewertung muss durch medizinisches Fachpersonal erfolgen.',
  }

  saveSummary(summary)

  return summary
}

function detectRedFlags(data: SummaryRequest): string[] {
  const redFlags: string[] = []

  const freeText = data.symptoms.freeText.toLowerCase()
  const selectedSymptoms = data.symptoms.selectedSymptoms ?? []

  const hasSymptom = (symptom: string) =>
    selectedSymptoms.includes(symptom) || freeText.includes(symptom)

  if (
    hasSymptom('chest_pain') ||
    hasSymptom('chest_pressure') ||
    freeText.includes('brustschmerz') ||
    freeText.includes('druck auf der brust')
  ) {
    redFlags.push('chest_pain_or_pressure')
  }

  if (
    hasSymptom('shortness_of_breath') ||
    freeText.includes('atemnot') ||
    freeText.includes('schwer luft')
  ) {
    redFlags.push('shortness_of_breath')
  }

  if (
    hasSymptom('unconsciousness') ||
    freeText.includes('ohnmacht') ||
    freeText.includes('bewusstlos')
  ) {
    redFlags.push('loss_of_consciousness')
  }

  if (
    hasSymptom('severe_bleeding') ||
    freeText.includes('starke blutung') ||
    freeText.includes('blutet stark')
  ) {
    redFlags.push('severe_bleeding')
  }

  if (data.symptoms.severity !== undefined && data.symptoms.severity >= 8) {
    redFlags.push('high_severity')
  }

  if (data.symptoms.progression === 'worse') {
    redFlags.push('worsening_symptoms')
  }

  return redFlags
}

function determineUrgencyLevel(
  data: SummaryRequest,
  redFlags: string[]
): UrgencyLevel {
  if (
    redFlags.includes('chest_pain_or_pressure') &&
    redFlags.includes('shortness_of_breath')
  ) {
    return 'emergency'
  }

  if (
    redFlags.includes('loss_of_consciousness') ||
    redFlags.includes('severe_bleeding')
  ) {
    return 'emergency'
  }

  if (redFlags.length >= 2) {
    return 'urgent'
  }

  if (data.symptoms.severity !== undefined && data.symptoms.severity >= 5) {
    return 'soon'
  }

  if (data.symptoms.freeText.trim().length > 0) {
    return 'self_care'
  }

  return 'unknown'
}

function createPlainLanguageSummary(
  data: SummaryRequest,
  urgencyLevel: UrgencyLevel
): string {
  const symptomText = data.symptoms.freeText

  if (urgencyLevel === 'emergency') {
    return `Die beschriebenen Beschwerden wirken potenziell ernst. Besonders die Angabe "${symptomText}" sollte sofort medizinisch abgeklärt werden.`
  }

  if (urgencyLevel === 'urgent') {
    return `Die Angaben deuten darauf hin, dass eine zeitnahe medizinische Einschätzung sinnvoll ist. Beschrieben wurde: "${symptomText}".`
  }

  if (urgencyLevel === 'soon') {
    return `Die Beschwerden sollten beobachtet und ärztlich abgeklärt werden, wenn sie anhalten oder schlimmer werden. Beschrieben wurde: "${symptomText}".`
  }

  return `Die Beschwerden wurden aufgenommen und strukturiert zusammengefasst. Beschrieben wurde: "${symptomText}".`
}

function createProfessionalSummary(data: SummaryRequest): string {
  const { patient, symptoms } = data

  const patientLines = [
    'Patientendaten',
    `Alter: ${patient.age}`,
    `Geschlecht: ${patient.sex}`,
    patient.pregnant !== undefined
      ? `Schwangerschaft: ${patient.pregnant ? 'ja' : 'nein'}`
      : null,
    patient.knownConditions?.length
      ? `Vorerkrankungen: ${patient.knownConditions.join(', ')}`
      : 'Vorerkrankungen: keine Angabe',
    patient.medications?.length
      ? `Medikation: ${patient.medications.join(', ')}`
      : 'Medikation: keine Angabe',
    patient.allergies?.length
      ? `Allergien: ${patient.allergies.join(', ')}`
      : 'Allergien: keine Angabe',
  ]

  const symptomLines = [
    '',
    'Beschwerden:',
    `Beschreibung: ${symptoms.freeText}`,
    symptoms.duration ? `Dauer: ${symptoms.duration}` : 'Dauer: keine Angabe',
    symptoms.severity !== undefined
      ? `Schweregrad: ${symptoms.severity}/10`
      : 'Schweregrad: keine Angabe',
    symptoms.location ? `Lokalisation: ${symptoms.location}` : 'Lokalisation: keine Angabe',
    symptoms.progression ? `Verlauf: ${symptoms.progression}` : 'Verlauf: keine Angabe',
  ]

  return [...patientLines, ...symptomLines]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}
function createMissingInformationList(data: SummaryRequest): string[] {
  const missing: string[] = []

  if (!data.symptoms.duration) {
    missing.push('Seit wann bestehen die Beschwerden?')
  }

  if (data.symptoms.severity === undefined) {
    missing.push('Wie stark sind die Beschwerden auf einer Skala von 0 bis 10?')
  }

  if (!data.symptoms.progression) {
    missing.push('Werden die Beschwerden besser, gleichbleibend oder schlimmer?')
  }

  if (!data.symptoms.location) {
    missing.push('Wo genau treten die Beschwerden auf?')
  }

  return missing
}

function createNextStep(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'emergency':
      return 'emergency_care_required'
    case 'urgent':
      return 'medical_assessment_required'
    case 'soon':
      return 'doctor_visit_recommended'
    case 'self_care':
      return 'self_care_possible'
    default:
      return 'more_information_required'
  }
}

function createRecommendationMessage(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'emergency':
      return 'Bitte sofort medizinische Hilfe in Anspruch nehmen. Bei akuter Gefahr sollte der Notruf gewählt werden.'
    case 'urgent':
      return 'Bitte zeitnah medizinisch abklären lassen.'
    case 'soon':
      return 'Ein Arztkontakt in den nächsten Tagen ist sinnvoll, besonders wenn die Beschwerden anhalten oder schlimmer werden.'
    case 'self_care':
      return 'Die Beschwerden können zunächst beobachtet werden. Bei Verschlechterung sollte medizinischer Rat eingeholt werden.'
    default:
      return 'Es fehlen noch wichtige Informationen für eine sinnvolle Ersteinschätzung.'
  }
}

export function getSummaryById(summaryId: string): SummaryResponse | undefined {
  return getSummary(summaryId)
}