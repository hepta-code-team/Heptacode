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
  const conditionDetails = Object.entries(patientData.conditionDetails)
    .filter(([, detail]) => hasText(detail))
    .map(([condition, detail]) => `${condition}: ${detail.trim()}`)

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
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    patientData.recentAbroad
      ? `Auslandsaufenthalt letzte 3 Monate: ${hasText(patientData.recentAbroadDetails) ? patientData.recentAbroadDetails.trim() : 'Ja'}`
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
        hasText(symptom.details) ? `Details: ${symptom.details.trim()}` : null,
        `${measurementLabel}: ${symptom.measurementValue}${unit}`,
        `Dauer: ${duration}`,
      ].filter((part): part is string => part !== null).join(', ')
    })
    .join('\n')
}

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
  const recommendedSpecialty =
    triageResult.recommendedSpecialty ?? fallbackSpecialtyForCareLevel(triageResult.careLevel)

  return {
    careLevel: triageResult.careLevel,
    recommendedSpecialty,
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
    ...(triageResult.aiModel ? { aiModel: triageResult.aiModel } : {}),
    createdAt: new Date().toISOString(),
  }
}
