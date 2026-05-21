import type { ReviewSummary, TriageSymptom } from '../triage/triage.types.js'
import { evaluateTriage } from '../triage/triage.service.js'
import type { AssessmentPayload, AssessmentResult, Symptom } from './assessment.types.js'

const DURATION_LABELS: Record<string, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

const MEASUREMENT_LABELS: Record<Symptom['measurementType'], string> = {
  pain: 'Schmerzstaerke',
  temperature: 'Temperatur',
  feeling: 'Beschwerdegefuehl',
  severity: 'Schweregrad',
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

function buildPatientDataLines(patientData: AssessmentPayload['patientData']): string[] {
  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height} cm`,
    `Gewicht: ${patientData.weight} kg`,
    `Geschlecht: ${patientData.gender}`,
    patientData.isPregnant ? 'Schwanger: Ja' : null,
    patientData.isBreastfeeding ? 'Stillend: Ja' : null,
    hasText(patientData.currentMood) ? `Aktuelle Stimmung: ${patientData.currentMood.trim()}` : null,
    hasText(patientData.smokerStatus) && patientData.smokerStatus.trim() !== 'Nicht angegeben'
      ? `Raucherstatus: ${patientData.smokerStatus.trim()}`
      : null,
    patientData.takesBloodThinners ? 'Blutverduenner: Ja' : null,
    hasText(patientData.immuneSystemStatus) && patientData.immuneSystemStatus.trim() !== 'Nicht angegeben'
      ? `Immunsystem: ${patientData.immuneSystemStatus.trim()}`
      : null,
    hasText(patientData.immuneSystemDetails)
      ? `Immunsystem Details: ${patientData.immuneSystemDetails.trim()}`
      : null,
    hasText(patientData.allergies) ? `Allergien: ${patientData.allergies.trim()}` : null,
    hasText(patientData.medications) ? `Medikamente: ${patientData.medications.trim()}` : null,
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    hasText(patientData.drugDetails) ? `Substanz Details: ${patientData.drugDetails.trim()}` : null,
    patientData.recentAbroad
      ? `Auslandsaufenthalt letzte 3 Monate: ${hasText(patientData.recentAbroadDetails) ? patientData.recentAbroadDetails.trim() : 'Ja'}`
      : null,
    patientData.conditions.length > 0
      ? `Vorerkrankungen: ${patientData.conditions.join(', ')}`
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

function formatSymptomDetails({ symptomDetails }: AssessmentPayload): string {
  return symptomDetails
    .map((symptom: Symptom, index: number) => {
      const measurementLabel = MEASUREMENT_LABELS[symptom.measurementType]
      const unit = symptom.measurementType === 'temperature' ? '°C' : '/10'
      const duration = DURATION_LABELS[symptom.duration] ?? symptom.duration

      return [
        `${index + 1}. ${symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}`,
        `${measurementLabel}: ${symptom.measurementValue}${unit}`,
        `Dauer: ${duration}`,
      ].join(', ')
    })
    .join('\n')
}

function toTriageSymptoms(symptoms: Symptom[]): TriageSymptom[] {
  return symptoms.map((symptom) => ({
    region: symptom.region,
    ...(symptom.side ? { side: symptom.side } : {}),
    painLevel: symptom.measurementValue,
    duration:
      symptom.duration === 'today' ||
      symptom.duration === 'days' ||
      symptom.duration === 'week' ||
      symptom.duration === 'weeks'
        ? symptom.duration
        : undefined,
  }))
}

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

function sanitizeProfessionalSummary(summary: string): string {
  return summary
    .split('\n')
    .filter((line) => !line.includes('Keine Angabe'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function evaluateAssessmentWithAi(
  payload: AssessmentPayload,
): Promise<AssessmentResult> {
  const triageResult = await evaluateTriage(
    payload.patientData,
    toTriageSymptoms(payload.symptomDetails),
  )

  const rawReviewSummary = triageResult.reviewSummary ?? buildFallbackReviewSummary(payload)
  const reviewSummary = {
    ...rawReviewSummary,
    professionalSummary: sanitizeProfessionalSummary(rawReviewSummary.professionalSummary),
  }

  return {
    careLevel: triageResult.careLevel,
    recommendedSpecialty: triageResult.recommendedSpecialty,
    reasons:
      triageResult.reasons.length > 0
        ? triageResult.reasons
        : ['Die Angaben wurden ausgewertet. Bei Verschlechterung bitte erneut medizinisch vorstellen.'],
    reviewSummary,
    ...(triageResult.recommendedSpecialties
      ? { recommendedSpecialties: triageResult.recommendedSpecialties }
      : {}),
    summary: reviewSummary.plainLanguage,
    ...(triageResult.aiUnavailable ? { aiUnavailable: true } : {}),
    createdAt: new Date().toISOString(),
  }
}
