import type { TriageSymptom } from '../modules/triage/triage.types.js'
import type { TriageAiResponse } from './validation.js'

/**
 * Normalizes optional symptom text before keyword matching.
 */
function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

/**
 * Maps different measurement types onto one comparable urgency scale.
 *
 * Fever values are converted to the same rough severity range used by pain values.
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
 * Detects high-risk symptom patterns that should not be classified as self-care.
 */
function hasEmergencyPattern(symptom: TriageSymptom): boolean {
  const region = normalizeText(symptom.region)
  const side = normalizeText(symptom.side)
  const details = normalizeText(symptom.details)
  const combinedText = `${region} ${side} ${details}`
  const measurementValue = getComparableMeasurementValue(symptom)

  if (
    combinedText.includes('suizid') ||
    combinedText.includes('selbstverletz') ||
    combinedText.includes('selbsttoet')
  ) {
    return true
  }

  if (
    combinedText.includes('verwirr') ||
    combinedText.includes('sprach') ||
    combinedText.includes('laehmung') ||
    combinedText.includes('lähmung') ||
    combinedText.includes('halbseit') ||
    combinedText.includes('schwaeche') ||
    combinedText.includes('schwäche')
  ) {
    return true
  }

  if (region === 'brust') {
    return (
      measurementValue >= 5 ||
      side.includes('links') ||
      side.includes('brustmitte') ||
      side.includes('atem') ||
      details.includes('atemnot') ||
      details.includes('luftnot')
    )
  }

  return (
    measurementValue >= 8 ||
    combinedText.includes('atemnot') ||
    combinedText.includes('luftnot') ||
    combinedText.includes('bewusstlos') ||
    combinedText.includes('starke blutung') ||
    combinedText.includes('blutet stark')
  )
}

/**
 * Checks whether every symptom is low intensity and has no warning pattern.
 */
function hasOnlyMildSymptoms(symptoms: TriageSymptom[]): boolean {
  return symptoms.length > 0 && symptoms.every((symptom) => {
    const measurementValue = getComparableMeasurementValue(symptom)

    return measurementValue > 0 && measurementValue <= 3 && !hasEmergencyPattern(symptom)
  })
}

/**
 * Checks whether a structured AI triage response is medically plausible for the given symptoms.
 *
 * These checks do not replace clinical validation; they catch obvious contradictions
 * before an AI answer is trusted by downstream presentation or assessment code.
 */
export function getTriageAiPlausibilityIssues(
  response: TriageAiResponse,
  symptoms: TriageSymptom[],
): string[] {
  const issues: string[] = []
  const hasEmergencySymptom = symptoms.some(hasEmergencyPattern)

  if (hasEmergencySymptom && response.careLevel === 'selfcare') {
    issues.push('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  }

  if (hasOnlyMildSymptoms(symptoms) && response.careLevel === 'emergency') {
    issues.push('Milde Beschwerden ohne Warnzeichen duerfen nicht als emergency eingestuft werden.')
  }

  if (response.careLevel === 'specialist' && !response.recommendedSpecialty) {
    issues.push('Specialist-Antworten benoetigen eine passende Fachrichtung.')
  }

  if (response.reasons.some((reason) => reason.trim().length < 8)) {
    issues.push('Begruendungen muessen nachvollziehbar und nicht nur Platzhalter sein.')
  }

  if (
    response.reviewSummary.plainLanguage.trim().length < 12 ||
    response.reviewSummary.professionalSummary.trim().length < 12
  ) {
    issues.push('Review-Summary muss in beiden Feldern ausreichend aussagekraeftig sein.')
  }

  return issues
}
