import type { TriageSymptom } from '../modules/triage/triage.types.js'
import type { MedicalSpecialty } from '../modules/triage/triage.types.js'
import type { TriageAiResponse } from './validation.js'

const SPECIALTY_KEYWORDS: Record<MedicalSpecialty, string[]> = {
  home_care: [],
  emergency_medicine: ['notfallmedizin', 'notaufnahme', 'rettungsdienst'],
  general_practice: ['allgemeinmedizin', 'hausaerzt', 'hausarzt'],
  internal_medicine: ['innere medizin', 'internist'],
  cardiology: ['kardiolog'],
  neurology: ['neurolog'],
  orthopedics: ['orthopaed', 'orthopad'],
  gastroenterology: ['gastroenterolog', 'magen-darm', 'verdauung'],
  pulmonology: ['pneumolog', 'lungenfach'],
  dermatology: ['dermatolog', 'hautarzt'],
  urology: ['urolog'],
  gynecology: ['gynaekolog', 'gynakolog', 'frauenarzt'],
  psychiatry: ['psychiatr', 'psychotherapeut'],
  pediatrics: ['paediatr', 'padiatr', 'kinderarzt', 'kinderheilkunde'],
  dentistry: ['zahnarzt', 'zahnmedizin'],
  ophthalmology: ['augenarzt', 'ophthalmolog'],
  otolaryngology: ['hno', 'hals-nasen-ohren', 'otolaryngolog'],
}

const NON_SPECIALIST_SPECIALTIES: MedicalSpecialty[] = [
  'home_care',
  'emergency_medicine',
  'general_practice',
]

/**
 * Normalizes optional symptom text before keyword matching.
 */
function normalizeText(value: string | undefined): string {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00df/g, 'ss') ?? ''
}

function isSpecialistSpecialty(
  specialty: MedicalSpecialty | undefined,
): specialty is MedicalSpecialty {
  return specialty !== undefined && !NON_SPECIALIST_SPECIALTIES.includes(specialty)
}

function getResponseText(response: TriageAiResponse): string {
  return normalizeText([
    ...response.reasons,
    response.reviewSummary.plainLanguage,
    response.reviewSummary.professionalSummary,
  ].join(' '))
}

function findMentionedSpecialties(response: TriageAiResponse): MedicalSpecialty[] {
  const responseText = getResponseText(response)

  return Object.entries(SPECIALTY_KEYWORDS)
    .filter(([specialty, keywords]) => {
      return (
        isSpecialistSpecialty(specialty as MedicalSpecialty) &&
        keywords.some((keyword) => new RegExp(`(^|[^a-z])${keyword}`, 'i').test(responseText))
      )
    })
    .map(([specialty]) => specialty as MedicalSpecialty)
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
export function hasEmergencyTriagePattern(symptom: TriageSymptom): boolean {
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

    return measurementValue > 0 && measurementValue <= 3 && !hasEmergencyTriagePattern(symptom)
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
  const hasEmergencySymptom = symptoms.some(hasEmergencyTriagePattern)

  if (hasEmergencySymptom && response.careLevel === 'selfcare') {
    issues.push('Warnsymptome duerfen nicht als selfcare eingestuft werden.')
  }

  if (hasOnlyMildSymptoms(symptoms) && response.careLevel === 'emergency') {
    issues.push('Milde Beschwerden ohne Warnzeichen duerfen nicht als emergency eingestuft werden.')
  }

  if (response.careLevel === 'specialist' && !response.recommendedSpecialty) {
    issues.push('Empfehlungen zu Fachrichtungen benoetigen eine genaue Angabe der Fachrichtung.')
  }

  const mentionedSpecialties = findMentionedSpecialties(response)

  if (
    response.careLevel !== 'specialist' &&
    mentionedSpecialties.length > 0
  ) {
    issues.push('Wenn eine Fachrichtung genannt wird, muss diese auch als Empfehlung eingestuft werden.')
  }

  if (
    response.careLevel === 'specialist' &&
    response.recommendedSpecialty &&
    mentionedSpecialties.some((specialty) => specialty !== response.recommendedSpecialty)
  ) {
    issues.push('Genannte Fachrichtung muss zur empfohlenen Fachrichtung passen.')
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
