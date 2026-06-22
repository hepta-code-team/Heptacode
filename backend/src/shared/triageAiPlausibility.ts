import type { TriageSymptom } from '../modules/triage/triage.types.js'
import type { MedicalSpecialty } from '../modules/triage/triage.types.js'
import type { TriageAiResponse } from './validation.js'

type PlausibilityTriageResponse = {
  careLevel: TriageAiResponse['careLevel']
  recommendedSpecialty?: MedicalSpecialty
  reasons: string[]
  reviewSummary: TriageAiResponse['reviewSummary']
}

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

const SPECIALTY_RECOMMENDATION_KEYWORDS = [
  'abklaer',
  'abgeklar',
  'abgeklaer',
  'behandel',
  'empfehl',
  'facharzt',
  'fachrichtung',
  'konsult',
  'termin',
  'uberweis',
  'ueberweis',
  'vorstell',
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

function getResponseText(response: PlausibilityTriageResponse): string {
  return normalizeText([
    ...response.reasons,
    response.reviewSummary.plainLanguage,
    response.reviewSummary.professionalSummary,
  ].join(' '))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Requires specialty wording to appear near an actual recommendation phrase.
 */
function hasSpecialtyRecommendationContext(responseText: string, keyword: string): boolean {
  const specialtyPattern = `(^|[^a-z])${escapeRegExp(keyword)}[a-z]*`
  const recommendationPattern = `(?:${SPECIALTY_RECOMMENDATION_KEYWORDS.join('|')})[a-z]*`
  const beforeSpecialty = new RegExp(
    `${recommendationPattern}[^.!?\\n]{0,60}${specialtyPattern}`,
    'i',
  )
  const afterSpecialty = new RegExp(
    `${specialtyPattern}[^.!?\\n]{0,60}${recommendationPattern}`,
    'i',
  )

  return beforeSpecialty.test(responseText) || afterSpecialty.test(responseText)
}

function findRecommendedSpecialties(response: PlausibilityTriageResponse): MedicalSpecialty[] {
  const responseText = getResponseText(response)

  return Object.entries(SPECIALTY_KEYWORDS)
    .filter(([specialty, keywords]) => {
      return (
        isSpecialistSpecialty(specialty as MedicalSpecialty) &&
        keywords.some((keyword) => hasSpecialtyRecommendationContext(responseText, keyword))
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
 * Detects a warning term only when its local sentence context does not negate it.
 */
function hasAffirmedWarningTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => {
    let searchIndex = 0

    while (searchIndex < text.length) {
      const termIndex = text.indexOf(term, searchIndex)

      if (termIndex === -1) {
        return false
      }

      const beforeTerm = text.slice(Math.max(0, termIndex - 40), termIndex)
      const afterTerm = text.slice(termIndex + term.length, termIndex + term.length + 32)
      const negatedBefore = /\b(?:kein[a-z]*|ohne|weder)\b[^.!?,;]{0,35}$/i.test(beforeTerm)
      const negatedAfter =
        /^[^.!?,;]{0,24}\b(?:besteht|ist|liegt|tritt|vorhanden|war)\b[^.!?,;]{0,12}\bnicht\b/i
          .test(afterTerm) ||
        /^[^.!?,;]{0,12}\bnicht mehr\b/i.test(afterTerm)

      if (!negatedBefore && !negatedAfter) {
        return true
      }

      searchIndex = termIndex + term.length
    }

    return false
  })
}

/**
 * Keeps transient focal neurological deficits urgent even after they resolve.
 */
function hasTransientNeurologicalWarningPattern(text: string): boolean {
  const hasNeurologicalDeficit = [
    'sprach',
    'laehmung',
    'lahmung',
    'halbseit',
    'schwaeche',
    'schwache',
  ].some((term) => text.includes(term))
  const hasTransientCourse = [
    'vorubergehend',
    'kurzzeitig',
    'inzwischen',
    'abgeklungen',
    'verschwunden',
    'wieder normal',
    'nicht mehr',
  ].some((term) => text.includes(term))

  return hasNeurologicalDeficit && hasTransientCourse
}

/**
 * Detects descriptions of a seizure continuing beyond the five-minute threshold.
 */
function hasProlongedSeizurePattern(text: string): boolean {
  const hasSeizure = [
    'krampfanfall',
    'epileptischer anfall',
    'konvulsion',
  ].some((term) => text.includes(term))
  const hasProlongedCourse =
    /\bseit\b[^.!?,;]{0,20}\b(?:5|funf|6|sechs|7|sieben|8|acht|9|neun|10|zehn)\b[^.!?,;]{0,10}\bminut/.test(text) ||
    /\b(?:langer|mehr)\s+als\s+(?:5|funf)\b[^.!?,;]{0,10}\bminut/.test(text) ||
    /\b(?:anhaltend|halt[^.!?,;]{0,12}\ban)\b/.test(text)

  return hasSeizure && hasProlongedCourse
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
    hasTransientNeurologicalWarningPattern(combinedText) ||
    hasProlongedSeizurePattern(combinedText)
  ) {
    return true
  }

  if (hasAffirmedWarningTerm(combinedText, [
    'suizid',
    'selbstverletz',
    'selbsttoet',
    'selbsttot',
  ])) {
    return true
  }

  if (hasAffirmedWarningTerm(combinedText, [
    'verwirr',
    'sprach',
    'laehmung',
    'lahmung',
    'halbseit',
    'schwaeche',
    'schwache',
  ])) {
    return true
  }

  if (
    hasAffirmedWarningTerm(combinedText, ['anaphylax', 'allergische reaktion']) ||
    (hasAffirmedWarningTerm(combinedText, ['zunge', 'hals', 'gesicht']) &&
      hasAffirmedWarningTerm(combinedText, ['schwell', 'schwill', 'zugeschwollen']))
  ) {
    return true
  }

  if (region === 'brust') {
    return (
      measurementValue >= 5 ||
      side.includes('links') ||
      side.includes('brustmitte') ||
      side.includes('atem') ||
      hasAffirmedWarningTerm(details, ['atemnot', 'luftnot'])
    )
  }

  return (
    measurementValue >= 8 ||
    hasAffirmedWarningTerm(combinedText, [
      'atemnot',
      'luftnot',
      'bewusstlos',
      'starke blutung',
      'blutet stark',
      'viel blut',
      'starker blutverlust',
      'blutiges erbrechen',
      'bluterbrechen',
      'kaffeesatz',
      'bluthusten',
      'blutiger auswurf',
      'schwarzer stuhl',
      'teerstuhl',
    ])
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
  response: PlausibilityTriageResponse,
  symptoms: TriageSymptom[],
): string[] {
  const issues: string[] = []
  const hasEmergencySymptom = symptoms.some(hasEmergencyTriagePattern)

  if (hasEmergencySymptom && response.careLevel === 'selfcare') {
    issues.push('Warnsymptome dürfen nicht als selfcare eingestuft werden.')
  }

  if (hasOnlyMildSymptoms(symptoms) && response.careLevel === 'emergency') {
    issues.push('Milde Beschwerden ohne Warnzeichen dürfen nicht als emergency eingestuft werden.')
  }

  if (response.careLevel === 'specialist' && !response.recommendedSpecialty) {
    issues.push('Empfehlungen zu Fachrichtungen benötigen eine genaue Angabe der Fachrichtung.')
  }

  const recommendedSpecialties = findRecommendedSpecialties(response)

  if (
    response.careLevel !== 'specialist' &&
    recommendedSpecialties.length > 0
  ) {
    issues.push('Wenn eine Fachrichtung genannt wird, muss diese auch als Empfehlung eingestuft werden.')
  }

  if (
    response.careLevel === 'specialist' &&
    response.recommendedSpecialty &&
    recommendedSpecialties.some((specialty) => specialty !== response.recommendedSpecialty)
  ) {
    issues.push('Genannte Fachrichtung muss zur empfohlenen Fachrichtung passen.')
  }

  if (response.reasons.some((reason) => reason.trim().length < 8)) {
    issues.push('Begründungen müssen nachvollziehbar und nicht nur Platzhalter sein.')
  }

  if (
    response.reviewSummary.plainLanguage.trim().length < 12 ||
    response.reviewSummary.professionalSummary.trim().length < 12
  ) {
    issues.push('Review-Summary muss in beiden Feldern ausreichend aussagekräftig sein.')
  }

  return issues
}
