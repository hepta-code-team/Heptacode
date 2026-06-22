import type { PatientData } from '../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../shared/symptom.types.js'

export const PREGNANCY_PLAUSIBILITY_ERROR_MESSAGE =
  'Die Angaben passen logisch nicht zusammen: Bei Geschlecht "männlich" sind Schwangerschaft oder Wehen nicht plausibel. Bitte korrigieren Sie die Stammdaten oder die Beschwerdebeschreibung.'

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function normalizeForPlausibilityCheck(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isMaleGender(gender: string | undefined): boolean {
  if (!gender) {
    return false
  }

  const normalizedGender = normalizeForPlausibilityCheck(gender).trim()
  return ['mannlich', 'maennlich', 'male', 'm'].includes(normalizedGender)
}

function mentionsPregnancyOrLabor(value: string | undefined): boolean {
  if (!hasText(value)) {
    return false
  }

  const normalizedText = normalizeForPlausibilityCheck(value)

  const pregnancyMention = /\b(schwanger|schwangerschaft|schwangerschaftsdiabetes)\b/.test(normalizedText)
  const negatedPregnancyMention =
    /\b(nicht|nie|kein|keine|keinen)\s+(schwanger|schwangerschaft|schwangerschaftsdiabetes)\b/.test(normalizedText)
  const laborMention = /\bwehen\b/.test(normalizedText)

  return laborMention || (pregnancyMention && !negatedPregnancyMention)
}

export function getPatientPlausibilityError(
  patientData: PatientData | undefined,
  text: string | undefined,
  symptoms: TriageSymptom[] | undefined,
): string | null {
  if (!isMaleGender(patientData?.gender)) {
    return null
  }

  const mentionsInSymptoms = (symptoms ?? []).some((symptom) =>
    mentionsPregnancyOrLabor(
      [
        symptom.region,
        symptom.side,
        symptom.details,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' '),
    ),
  )

  if (patientData?.isPregnant || mentionsPregnancyOrLabor(text) || mentionsInSymptoms) {
    return PREGNANCY_PLAUSIBILITY_ERROR_MESSAGE
  }

  return null
}
