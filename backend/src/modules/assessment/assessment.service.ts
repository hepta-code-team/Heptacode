import type { ConditionDetail } from '../../../../shared/patientData.types.js'
import type { ReviewSummary, TriageSymptom } from '../triage/triage.types.js'
import { evaluateTriage } from '../triage/triage.service.js'
import type { AssessmentPayload, AssessmentResult, Symptom } from './assessment.types.js'
import { normalizeGermanText } from '../../shared/normalizeGermanText.js'

const DURATION_LABELS: Record<string, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

const MEASUREMENT_LABELS: Record<Symptom['measurementType'], string> = {
  pain: 'Schmerzstärke',
  temperature: 'Temperatur',
  feeling: 'Beschwerdegefühl',
  severity: 'Schweregrad',
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function formatConditionDetail({ detail, duration }: ConditionDetail): string | null {
  const parts = [
    hasText(detail) ? detail.trim() : null,
    hasText(duration) ? `Dauer: ${duration.trim()}` : null,
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Converts optional patient fields into compact prompt lines.
 *
 * Empty optional fields are omitted so the AI sees only clinically relevant
 * context instead of placeholders such as "Keine Angabe".
 */
function buildPatientDataLines(patientData: AssessmentPayload['patientData']): string[] {
  const conditionDetails = Object.entries(patientData.conditionDetails)
    .map(([condition, detail]) => {
      const formattedDetail = formatConditionDetail(detail)
      return formattedDetail ? `${condition}: ${formattedDetail}` : null
    })
    .filter((detail): detail is string => detail !== null)

  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height} cm`,
    `Gewicht: ${patientData.weight} kg`,
    `Geschlecht: ${patientData.gender}`,
    patientData.isPregnant ? 'Schwanger: Ja' : null,
    patientData.isBreastfeeding ? 'Stillend: Ja' : null,
    hasText(patientData.allergies) ? `Allergien: ${patientData.allergies.trim()}` : null,
    hasText(patientData.medications) ? `Medikamente: ${patientData.medications.trim()}` : null,
    hasText(patientData.medicationDuration) ? `Einahmedauer Medikamente: ${patientData.medicationDuration.trim()}` : null,
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    patientData.recentAbroad === 'Ja'
      ? `Auslandsaufenthalt letzte 3 Monate: ${hasText(patientData.recentAbroadDetails) ? patientData.recentAbroadDetails.trim() : 'Ja'}`
      : null,
    patientData.conditions.length > 0
      ? `Vorerkrankungen: ${patientData.conditions.join(', ')}`
      : null,
    patientData.isSmoker ? `Raucher: ${patientData.isSmoker}` : null,
    patientData.isSmoker !== '' && patientData.isSmoker !== 'Nein' && patientData.isSmoker !== 'Nie' && hasText(patientData.smokingSinceYears)
      ? `Rauchdauer: ${patientData.smokingSinceYears.trim()}`
      : null,
    patientData.isSmoker !== '' && patientData.isSmoker !== 'Nein' && patientData.isSmoker !== 'Nie' && hasText(patientData.cigarettesPerDay)
      ? `Rauchmenge: ${patientData.cigarettesPerDay.trim()}`
      : null,
    conditionDetails.length > 0
      ? `Details zu Vorerkrankungen: ${conditionDetails.join('; ')}`
      : null,
  ].filter((line): line is string => line !== null)
}

function formatPatientData({ patientData }: AssessmentPayload): string {
  return buildPatientDataLines(patientData).join('\n')
}

function formatSelectedSymptoms({ selectedSymptoms }: AssessmentPayload): string {
  if (selectedSymptoms.length === 0) {
    return 'Keine vorausgewaehlten Symptome uebergeben.'
  }

  return selectedSymptoms
    .map(
      (symptom: AssessmentPayload['selectedSymptoms'][number], index: number) =>
        `${index + 1}. ${symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}`,
    )
    .join('\n')
}

/**
 * Formats detailed symptom inputs for the fallback professional summary.
 *
 * This mirrors the wording used in the triage prompt so exported summaries and
 * AI-facing input stay easy to compare during debugging.
 */
function formatSymptomDetails({ symptomDetails }: AssessmentPayload): string {
  return symptomDetails
    .map((symptom: Symptom, index: number) => {
      const measurementLabel = MEASUREMENT_LABELS[symptom.measurementType]
      const unit = symptom.measurementType === 'temperature' ? '°C' : '/10'
      const duration = DURATION_LABELS[symptom.duration] ?? symptom.duration

      return [
        `${index + 1}. ${symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}`,
        hasText(symptom.details) ? `Details: ${symptom.details.trim()}` : null,
        `${measurementLabel}: ${symptom.measurementValue}${unit}`,
        `Dauer: ${duration}`,
      ].filter((part): part is string => part !== null).join(', ')
    })
    .join('\n')
}

/**
 * Adapts frontend assessment symptoms to the smaller triage contract.
 *
 * Optional fields are only included when present because the triage schema uses
 * missing values to distinguish "unknown" from intentionally selected data.
 */
function toTriageSymptoms(symptoms: Symptom[]): TriageSymptom[] {
  return symptoms.map((symptom) => ({
    region: symptom.region,
    ...(symptom.side ? { side: symptom.side } : {}),
    ...(hasText(symptom.details) ? { details: symptom.details.trim() } : {}),
    measurementType: symptom.measurementType,
    measurementValue: symptom.measurementValue,
    duration: symptom.duration,
  }))
}

/**
 * Builds a deterministic review summary when the triage layer does not return one.
 *
 * The structure is intentionally section-based because the result page and PDF
 * export both parse these headings for editable professional summaries.
 */
function buildFallbackReviewSummary(payload: AssessmentPayload): ReviewSummary {
  return {
    plainLanguage:
      'Ihre Angaben wurden strukturiert ausgewertet. Bitte orientieren Sie sich an der empfohlenen Versorgungsebene und suchen Sie bei Verschlechterung medizinische Hilfe.',
    professionalSummary: [
      'Stammdaten:',
      formatPatientData(payload),
      '',
      'Ausgewaehlte Symptome:',
      formatSelectedSymptoms(payload),
      '',
      'Detailangaben zu aktiven Symptomen:',
      formatSymptomDetails(payload),
    ].join('\n'),
  }
}

/**
 * Supplies a safe display specialty for care levels that do not require one.
 *
 * The backend triage result can omit recommendedSpecialty for non-specialist
 * levels, while the frontend cards still expect a concrete label.
 */
function fallbackSpecialtyForCareLevel(
  careLevel: AssessmentResult['careLevel'],
): AssessmentResult['recommendedSpecialty'] {
  switch (careLevel) {
    case 'emergency':
      return 'emergency_medicine'
    case 'selfcare':
      return 'home_care'
    case 'specialist':
      return 'internal_medicine'
    case 'doctor':
    default:
      return 'general_practice'
  }
}

/**
 * Removes patient-facing filler text from the professional summary.
 *
 * The generated summary is later reused in the PDF, so this keeps the clinical
 * section concise and avoids duplicating generic patient explanations.
 */
function sanitizeProfessionalSummary(summary: string): string {
  const lines = summary
    .split('\n')
    .filter((line) => !line.includes('Keine Angabe'))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const filteredLines = lines.filter((line) => {
    return !/^Zusammenfassung für Patient(?:innen|:innen|innen und Patienten|innen und Patient:innen)/i.test(line)
  })

  return filteredLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Runs the full assessment flow and returns the stable frontend response shape.
 *
 * Triage is the source of truth for care level and specialty, while this layer
 * fills in presentation fields, timestamps, and review-summary fallbacks.
 */
export async function evaluateAssessmentWithAi(
  payload: AssessmentPayload,
): Promise<AssessmentResult> {
  const triageResult = await evaluateTriage(
    payload.patientData,
    toTriageSymptoms(payload.symptomDetails),
  )

  // Merge triage output with assessment-level fallbacks so the frontend always receives a complete result.
  const rawReviewSummary = triageResult.reviewSummary ?? buildFallbackReviewSummary(payload)
  const reviewSummary = {
    ...rawReviewSummary,
    plainLanguage: normalizeGermanText(rawReviewSummary.plainLanguage),
    professionalSummary: normalizeGermanText(
      sanitizeProfessionalSummary(rawReviewSummary.professionalSummary),
    ),
  }
  const recommendedSpecialty =
    triageResult.recommendedSpecialty ?? fallbackSpecialtyForCareLevel(triageResult.careLevel)

  return {
    careLevel: triageResult.careLevel,
    recommendedSpecialty,
    reasons: (
      triageResult.reasons.length > 0
        ? triageResult.reasons
        : ['Die Angaben wurden ausgewertet. Bei Verschlechterung bitte erneut medizinisch vorstellen.']
    ).map(normalizeGermanText),
    reviewSummary,
    ...(triageResult.recommendedSpecialties
      ? { recommendedSpecialties: triageResult.recommendedSpecialties }
      : {}),
    summary: reviewSummary.plainLanguage,
    ...(triageResult.aiUnavailable ? { aiUnavailable: true } : {}),
    ...(triageResult.aiModel ? { aiModel: triageResult.aiModel } : {}),
    createdAt: new Date().toISOString(),
  }
}