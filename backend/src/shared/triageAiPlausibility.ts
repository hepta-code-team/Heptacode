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

function hasDeferredSpecialtyContext(beforeSpecialty: string, afterSpecialty: string): boolean {
  const illustrativeBefore =
    /\b(?:wie|beispielsweise|zum beispiel|z b)\b[^.!?;\n]{0,55}$/i.test(beforeSpecialty)
  const deferredAfter =
    /^[^.!?;\n]{0,130}\b(?:kann|konnen|koennen|konnte|koennte|konnten|koennten|ggf|gegebenenfalls|eventuell|spaeter)\b[^.!?;\n]{0,80}\b(?:notwendig|erforderlich|sinnvoll|angezeigt)\b/i
      .test(afterSpecialty)
  const primaryCareAfter =
    /^[^.!?;\n]{0,180}\b(?:erste anlaufstelle|zunaechst|zunachst|erst)\b[^.!?;\n]{0,80}\b(?:hausarzt|hausaerzt|allgemeinmedizin)\b/i
      .test(afterSpecialty)

  return illustrativeBefore && (deferredAfter || primaryCareAfter)
}

function hasDescriptiveSpecialtyContext(afterSpecialty: string): boolean {
  return /^[^.!?;\n]{0,25}\b(?:erkrankung|erkrankungen|stoerung|storung|ursache|ursachen|symptom|symptome|beschwerde|beschwerden|funktion)\b/i
    .test(afterSpecialty)
}

/**
 * Requires specialty wording to appear near an actual recommendation phrase.
 */
function hasSpecialtyRecommendationContext(responseText: string, keyword: string): boolean {
  const specialtyPattern = new RegExp(
    `(^|[^a-z])(${escapeRegExp(keyword)}[a-z]*)`,
    'gi',
  )
  const recommendationPattern = `(?:${SPECIALTY_RECOMMENDATION_KEYWORDS.join('|')})[a-z]*`
  const recommendationBefore = new RegExp(
    `${recommendationPattern}[^.!?;\\n]{0,60}$`,
    'i',
  )
  const recommendationAfter = new RegExp(
    `^[^.!?;\\n]{0,60}${recommendationPattern}`,
    'i',
  )
  let match: RegExpExecArray | null

  while ((match = specialtyPattern.exec(responseText)) !== null) {
    const boundaryLength = match[1]?.length ?? 0
    const specialtyText = match[2] ?? ''
    const specialtyIndex = match.index + boundaryLength
    const beforeSpecialty = responseText.slice(
      Math.max(0, specialtyIndex - 80),
      specialtyIndex,
    )
    const afterSpecialty = responseText.slice(
      specialtyIndex + specialtyText.length,
      specialtyIndex + specialtyText.length + 220,
    )
    const negatedBefore =
      /\b(?:kein[a-z]*|weder)\b[^.!?;\n]{0,75}$/i.test(beforeSpecialty)
    const negatedAfter =
      /^[^.!?;\n]{0,50}\b(?:nicht|kein[a-z]*)\b[^.!?;\n]{0,30}\b(?:indiziert|erforderlich|notwendig|empfohlen|angezeigt|vorgesehen)\b/i
        .test(afterSpecialty)
    const deferredSpecialtyContext = hasDeferredSpecialtyContext(beforeSpecialty, afterSpecialty)
    const descriptiveSpecialtyContext = hasDescriptiveSpecialtyContext(afterSpecialty)

    if (
      !negatedBefore &&
      !negatedAfter &&
      !deferredSpecialtyContext &&
      !descriptiveSpecialtyContext &&
      (
        recommendationBefore.test(beforeSpecialty) ||
        recommendationAfter.test(afterSpecialty)
      )
    ) {
      return true
    }
  }

  return false
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
 * Detects symptom clusters compatible with meningitis or meningeal irritation.
 */
function hasMeningitisWarningPattern(text: string): boolean {
  const hasFeverOrSevereHeadache = [
    'fieber',
    'hohe temperatur',
    'starker kopfschmerz',
    'starke kopfschmerzen',
    'schlimmer kopfschmerz',
    'schlimme kopfschmerzen',
  ].some((term) => text.includes(term))
  const hasMeningealSign = [
    'nackensteif',
    'steifer nacken',
    'lichtempfind',
    'photophob',
    'nicht wegdruckbar',
    'glas test',
  ].some((term) => text.includes(term))
  const hasNeurologicalOrSystemicWarning = [
    'verwirr',
    'benommen',
    'schwer weckbar',
    'kaum weckbar',
    'krampfanfall',
    'erbrechen',
  ].some((term) => text.includes(term))

  return hasFeverOrSevereHeadache && hasMeningealSign && hasNeurologicalOrSystemicWarning
}

/**
 * Detects head injury descriptions with neurological or bleeding-risk warning signs.
 */
function hasHeadInjuryWarningPattern(text: string): boolean {
  const hasHeadInjury = [
    'kopfverletz',
    'sturz auf den kopf',
    'kopf angeschlagen',
    'schlag auf den kopf',
    'unfall mit kopf',
  ].some((term) => text.includes(term))
  const hasRiskFeature = [
    'bewusstlos',
    'ohnmacht',
    'erbrechen',
    'verwirr',
    'gedachtnisverlust',
    'erinnerungsluck',
    'blutverdunn',
    'apixaban',
    'eliquis',
    'rivaroxaban',
    'xarelto',
    'edoxaban',
    'lixiana',
    'savaysa',
    'dabigatran',
    'pradaxa',
    'acetylsalicylsaure',
    'ass',
    'aspirin',
    'warfarin',
    'marcumar',
  ].some((term) => text.includes(term))

  return hasHeadInjury && hasRiskFeature
}

/**
 * Detects ectopic-pregnancy warning clusters from symptom text.
 */
function hasEctopicPregnancyWarningPattern(text: string): boolean {
  const hasPregnancyContext = [
    'schwanger',
    'schwangerschaft',
    'positive schwangerschaftstest',
    'positiver schwangerschaftstest',
  ].some((term) => text.includes(term))
  const hasLowerAbdominalPain = [
    'unterbauch',
    'bauchschmerz',
    'abdominalschmerz',
  ].some((term) => text.includes(term))
  const hasBleedingOrReferredPain = [
    'vaginale blutung',
    'scheidenblutung',
    'blutung',
    'schulterschmerz',
    'schulterspitzenschmerz',
    'schwindel',
    'kollaps',
    'ohnmacht',
  ].some((term) => text.includes(term))

  return hasPregnancyContext && hasLowerAbdominalPain && hasBleedingOrReferredPain
}

/**
 * Detects diabetic ketoacidosis warning clusters from symptom text.
 */
function hasDiabeticKetoacidosisWarningPattern(text: string): boolean {
  const hasDiabetesContext = [
    'diabetes',
    'diabet',
    'insulin',
    'blutzucker',
    'ketoazidose',
  ].some((term) => text.includes(term))
  const hasMetabolicSymptoms = [
    'starker durst',
    'viel durst',
    'haufig',
    'oft wasserlassen',
    'fruchtiger atem',
    'azetongeruch',
    'acetongeruch',
    'tiefe atmung',
    'kussmaul',
  ].some((term) => text.includes(term))
  const hasSystemicSymptoms = [
    'erbrechen',
    'ubelkeit',
    'uebelkeit',
    'bauchschmerz',
    'verwirr',
    'benommen',
    'schwach',
  ].some((term) => text.includes(term))

  return hasDiabetesContext && hasMetabolicSymptoms && hasSystemicSymptoms
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
    hasProlongedSeizurePattern(combinedText) ||
    hasMeningitisWarningPattern(combinedText) ||
    hasHeadInjuryWarningPattern(combinedText) ||
    hasEctopicPregnancyWarningPattern(combinedText) ||
    hasDiabeticKetoacidosisWarningPattern(combinedText)
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
    response.careLevel !== 'emergency' &&
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
