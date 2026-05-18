import { saveSummary, getSummary } from './summary.store.js'
import type {
  SummaryRequest,
  SummaryResponse,
  SummaryTriage,
} from './summary.types.js'

export async function createSummaryService(
  data: SummaryRequest
): Promise<SummaryResponse> {
  if (!data.consent.acceptedDataProcessing) {
    throw new Error('CONSENT_REQUIRED')
  }

  const urgencyLevel = determineUrgencyLevel(data)

  return {
    summaryId: `summary_${Date.now()}`,

    triage: data.triage,

    aiReviewSummary: {
      plainLanguage: createPlainLanguageSummary(data),
      professionalSummary: createProfessionalSummary(data),
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
      'Diese Ersteinschätzung dient nur zur Orientierung und ersetzt keine ärztliche Diagnose oder Untersuchung. Bei akuten oder schweren Beschwerden sollte medizinische Hilfe in Anspruch genommen werden.',
  }

  saveSummary(summary)

  return summary
}

function determineUrgencyLevel(data: SummaryRequest): UrgencyLevel {
  if (data.symptoms.severity !== undefined && data.symptoms.severity >= 8) {
    return 'urgent'
  }

  if (data.symptoms.severity !== undefined && data.symptoms.severity >= 5) {
    return 'soon'
  }

  if (data.symptoms.progression === 'worse') {
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
  const { patient, symptoms, triage } = data

  const patientLines = [
    'Patientendaten:',
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
    symptoms.selectedSymptoms?.length
      ? `Ausgewählte Symptome: ${symptoms.selectedSymptoms.join(', ')}`
      : 'Ausgewählte Symptome: keine Angabe',
    symptoms.duration ? `Dauer: ${symptoms.duration}` : 'Dauer: keine Angabe',
    symptoms.severity !== undefined
      ? `Schweregrad: ${symptoms.severity}/10`
      : 'Schweregrad: keine Angabe',
    symptoms.location ? `Lokalisation: ${symptoms.location}` : 'Lokalisation: keine Angabe',
    symptoms.progression ? `Verlauf: ${symptoms.progression}` : 'Verlauf: keine Angabe',
  ]

  const triageLines = triage ? createTriageLines(triage) : []

  return [...patientLines, ...symptomLines, ...triageLines]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

function createTriageLines(triage: SummaryTriage): string[] {
  return [
    '',
    'Triage-Einstufung:',
    `Care Level: ${formatCareLevel(triage.careLevel)}`,
    `Empfohlene Fachrichtung: ${triage.recommendedSpecialty}`,
    triage.reasons.length > 0
      ? `Begründungen: ${triage.reasons.join('; ')}`
      : 'Begründungen: keine Angabe',
  ]
}

function formatCareLevel(careLevel: SummaryTriage['careLevel']): string {
  switch (careLevel) {
    case 'emergency':
      return 'Notfallversorgung'
    case 'doctor':
      return 'ärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
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
