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

  const urgencyLevel = determineUrgencyLevel(data)

  return {
    summaryId: `summary_${Date.now()}`,
    urgencyLevel,
    humanReviewRequired: true,

    aiReviewSummary: {
      plainLanguage: createPlainLanguageSummary(data, urgencyLevel),
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
      'Diese Einschätzung ersetzt keine ärztliche Diagnose. Die finale Bewertung muss durch medizinisches Fachpersonal erfolgen.',
  }
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
  const { patient, symptoms } = data

  return [
    `Patientendaten: Alter ${patient.age}, Geschlecht: ${patient.sex}.`,
    patient.pregnant !== undefined
      ? `Schwangerschaft: ${patient.pregnant ? 'ja' : 'nein'}.`
      : '',
    patient.knownConditions?.length
      ? `Vorerkrankungen: ${patient.knownConditions.join(', ')}.`
      : 'Keine Vorerkrankungen angegeben.',
    patient.medications?.length
      ? `Medikation: ${patient.medications.join(', ')}.`
      : 'Keine Medikation angegeben.',
    patient.allergies?.length
      ? `Allergien: ${patient.allergies.join(', ')}.`
      : 'Keine Allergien angegeben.',
    `Beschwerden: ${symptoms.freeText}.`,
    symptoms.duration ? `Dauer: ${symptoms.duration}.` : '',
    symptoms.severity !== undefined
      ? `Schweregrad: ${symptoms.severity}/10.`
      : '',
    symptoms.location ? `Lokalisation: ${symptoms.location}.` : '',
    symptoms.progression ? `Verlauf: ${symptoms.progression}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
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
