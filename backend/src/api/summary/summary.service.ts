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

  const summary: SummaryResponse = {
    summaryId: `summary_${Date.now()}`,

    triage: data.triage,

    aiReviewSummary: {
      plainLanguage: createPlainLanguageSummary(data),
      professionalSummary: createProfessionalSummary(data),
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

function createPlainLanguageSummary(data: SummaryRequest): string {
  const symptomText = data.symptoms.freeText.trim()

  if (data.triage) {
    return `Die Angaben wurden aufgenommen und strukturiert zusammengefasst. Die Versorgungsebene wurde zuvor im Triage-Prozess als "${formatCareLevel(data.triage.careLevel)}" eingestuft. Beschrieben wurde: "${symptomText}".`
  }

  return `Die Angaben wurden aufgenommen und strukturiert zusammengefasst. Beschrieben wurde: "${symptomText}".`
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
  patient.breastfeeding !== undefined
    ? `Stillend: ${patient.breastfeeding ? 'ja' : 'nein'}`
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
    case 'specialist':
      return 'fachärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
  }
}

export function getSummaryById(summaryId: string): SummaryResponse | undefined {
  return getSummary(summaryId)
}