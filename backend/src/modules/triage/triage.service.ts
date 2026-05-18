import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import { extractSymptoms } from '../symptom-extraction/symptomExtraction.service.js'
import type {
  CareLevel,
  MedicalSpecialty,
  PatientData,
  ReviewSummary,
  TriageResponse,
  TriageSymptom,
} from './triage.types.js'
import { triageAiResultSchema } from './triage.types.js'
import { triageInstructions } from '../prompt/triage.prompt.js'

function createBadRequestError(message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = 400
  return error
}

// Konstante fuer die Dauer-Labels
const DURATION_LABELS: Record<NonNullable<TriageSymptom['duration']>, string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

<<<<<<< HEAD
// Prompt von ChatGPT erstellt:
// Die KI waehlt Versorgungsangebot, Begruendungen und Review Summary.
// Die erlaubten Werte werden zusaetzlich ueber Zod validiert.
const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
  'Erlaubte careLevel-Werte sind ausschliesslich: emergency, doctor, specialist, selfcare.',
  `Erlaubte recommendedSpecialty-Werte sind ausschliesslich: ${medicalSpecialtySchema.options.join(', ')}.`,
  'Waehle recommendedSpecialty selbst passend zu den Angaben aus.',
  'home_care steht fuer haeusliche Versorgung.',
  'emergency_medicine steht fuer Notfallversorgung.',
  'general_practice steht fuer hausärztliche Abklärung.',
  'Alle anderen medizinischen Fachrichtungen stehen fuer fachärztliche Abklärung.',
  'careLevel muss zur Empfehlung passen: emergency_medicine -> emergency, home_care -> selfcare, general_practice -> doctor, alle anderen Fachrichtungen -> specialist.',
  'Beruecksichtige die uebergebenen Symptome, optionale Schmerzintensitaeten, Dauern und die Stammdaten.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko waehle die hoehere Versorgungsebene.',
  'Gib kurze, konkrete Begruendungen auf Deutsch zurueck.',
  'Erstelle zusaetzlich eine reviewSummary mit plainLanguage und professionalSummary.',
  'plainLanguage soll fuer Patientinnen und Patienten leicht verständlich sein.',
  'professionalSummary soll medizinisch strukturiert formuliert sein.',
  'Erfinde keine zusaetzlichen Symptome oder Stammdaten.',
].join('\n')
=======
>>>>>>> dev

// Funktion um die Patientendaten fuer die KI zu formatieren
function formatPatientData(patientData?: PatientData): string {
  if (!patientData) {
    return 'Keine Stammdaten uebergeben.'
  }

  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height}`,
    `Gewicht: ${patientData.weight}`,
    `Geschlecht: ${patientData.gender}`,
    `Schwanger: ${patientData.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillend: ${patientData.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${patientData.allergies || 'Keine Angabe'}`,
    `Medikamente: ${patientData.medications || 'Keine Angabe'}`,
    `Substanzbeeinflussung: ${patientData.substanceInfluence || 'Keine Angabe'}`,
    `Auslandsaufenthalt: ${patientData.recentAbroad ? patientData.recentAbroadDetails || 'Ja' : 'Nein'}`,
    `Vorerkrankungen: ${patientData.conditions.length > 0 ? patientData.conditions.join(', ') : 'Keine Angabe'}`,
  ].join('\n')
}

// Funktion um die Symptome fuer die KI zu formatieren
function formatSymptoms(symptoms: TriageSymptom[]): string {
  if (symptoms.length === 0) {
    return 'Keine Symptome uebergeben.'
  }

  return symptoms
    .map((symptom, index) => {
      const parts = [
        symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region,
        symptom.painLevel !== undefined ? `Schmerzstaerke ${symptom.painLevel}/10` : null,
        symptom.duration ? DURATION_LABELS[symptom.duration] : null,
      ].filter((part): part is string => part !== null)

      return `${index + 1}. ${parts.join(', ')}`
    })
    .join('\n')
}

// Funktion um das empfohlene Versorgungsangebot auf die grobe Ebene abzubilden
function toCareLevel(recommendedSpecialty: MedicalSpecialty): CareLevel {
  if (recommendedSpecialty === 'emergency_medicine') {
    return 'emergency'
  }

  if (recommendedSpecialty === 'home_care') {
    return 'selfcare'
  }

  if (recommendedSpecialty === 'general_practice') {
    return 'doctor'
  }

  return 'specialist'
}

// Funktion um widerspruechliche KI-Antworten zwischen careLevel und Empfehlung zu vermeiden
function ensureConsistentCareLevel(result: TriageResponse): TriageResponse {
  return {
    ...result,
    careLevel: toCareLevel(result.recommendedSpecialty),
  }
}

function formatCareLevel(careLevel: CareLevel): string {
  switch (careLevel) {
    case 'emergency':
      return 'Notfallversorgung'
    case 'doctor':
      return 'hausärztliche Abklärung'
    case 'specialist':
      return 'fachärztliche Abklärung'
    case 'selfcare':
      return 'Selbstversorgung'
    default:
      return careLevel
  }
}

function createFallbackReviewSummary(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
  result: Pick<TriageResponse, 'careLevel' | 'recommendedSpecialty' | 'reasons'>,
): ReviewSummary {
  const symptomText =
    symptoms.length > 0
      ? formatSymptoms(symptoms)
      : 'Keine konkreten Symptome uebergeben.'

  const patientText = patientData
    ? formatPatientData(patientData)
    : 'Keine Stammdaten uebergeben.'

  return {
    plainLanguage: `Die Angaben wurden ausgewertet. Die empfohlene Versorgungsebene ist: ${formatCareLevel(result.careLevel)}. Die empfohlene Fachrichtung ist: ${result.recommendedSpecialty}.`,
    professionalSummary: [
      'Patientendaten:',
      patientText,
      '',
      'Beschwerden:',
      symptomText,
      '',
      'Triage-Einstufung:',
      `Care Level: ${formatCareLevel(result.careLevel)}`,
      `Empfohlene Fachrichtung: ${result.recommendedSpecialty}`,
      result.reasons.length > 0
        ? `Begründungen: ${result.reasons.join('; ')}`
        : 'Begründungen: keine Angabe',
    ].join('\n'),
  }
}

// Funktion um Versorgungsebene, Fachrichtung und Review Summary vom AI zu requesten
async function requestTriageFromAi(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
<<<<<<< HEAD
  const completion = await aiClient.beta.chat.completions.parse({
    model: env.aiModel,
=======
  // Die KI erhaelt bereits strukturierte Eingaben und muss eine validierbare JSON-Antwort liefern.
  const parsed = await requestStructuredAiResponse({
>>>>>>> dev
    messages: [
      { role: 'system', content: triageInstructions },
      {
        role: 'user',
        content: [
          'Stammdaten:',
          formatPatientData(patientData),
          '',
          'Symptome:',
          formatSymptoms(symptoms),
        ].join('\n'),
      },
    ],
    schema: triageAiResultSchema,
    schemaName: 'triage_result',
    temperature: 0,
  })

  return ensureConsistentCareLevel(parsed)
}

<<<<<<< HEAD
  if (!parsed) {
    throw new Error('AI triage returned no structured result')
  }

  const consistentResult = ensureConsistentCareLevel(parsed)

  return {
    ...consistentResult,
    reviewSummary:
      consistentResult.reviewSummary ??
      createFallbackReviewSummary(patientData, symptoms, consistentResult),
=======
// Fallback fuer strukturierte Symptome: Ohne KI wird anhand der staerksten Schmerzangabe entschieden.
// Der Fallback ist bewusst vorsichtig, damit im Zweifel eher aerztlich abgeklaert wird.
function createFallbackTriage(symptoms: TriageSymptom[]): TriageResponse {
  const strongestPainLevel = Math.max(
    0,
    ...symptoms.map((symptom) => symptom.painLevel ?? 0),
  )

  if (strongestPainLevel >= 8) {
    return {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Aufgrund der sehr starken Beschwerden wird sicherheitshalber eine Notfallabklaerung empfohlen.',
      ],
      aiUnavailable: true,
    }
  }

  if (strongestPainLevel >= 5 || symptoms.length > 0) {
    return {
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      reasons: [
        'Die KI-Auswertung ist aktuell nicht verfuegbar.',
        'Bitte lassen Sie die Beschwerden aerztlich einschaetzen, besonders bei Verschlechterung oder anhaltenden Symptomen.',
      ],
      aiUnavailable: true,
    }
  }

  return {
    careLevel: 'selfcare',
    recommendedSpecialty: 'home_care',
    reasons: ['Die KI-Auswertung ist aktuell nicht verfuegbar. Ohne erkannte Symptome ist keine hoehere Dringlichkeit ableitbar.'],
    aiUnavailable: true,
  }
}

// Spezieller Fallback fuer Freitext: Wenn die KI keine Symptome extrahieren kann,
// ist eine sichere Selfcare-Einstufung nicht moeglich.
function createTextExtractionFallbackTriage(): TriageResponse {
  return {
    careLevel: 'doctor',
    recommendedSpecialty: 'general_practice',
    reasons: [
      'Die KI-Auswertung ist aktuell nicht verfuegbar.',
      'Die Freitext-Beschreibung konnte nicht sicher in Symptome ueberfuehrt werden. Bitte waehlen Sie die Symptome manuell aus oder lassen Sie die Beschwerden aerztlich einschaetzen.',
    ],
    aiUnavailable: true,
  }
}

// Wrapper fuer den KI-Call: bekannte KI-Ausfaelle werden abgefangen, echte Programmierfehler nicht.
async function requestTriageWithFallback(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[],
): Promise<TriageResponse> {
  try {
    return await requestTriageFromAi(patientData, symptoms)
  } catch (error) {
    // Nur Timeout/API/Antwortformat-Fehler loesen den medizinischen Fallback aus.
    if (!isAiRequestError(error)) {
      throw error
    }

    return createFallbackTriage(symptoms)
>>>>>>> dev
  }
}

// Funktion um die Versorgungsebene zu evaluieren
export async function evaluateTriage(
  patientData: PatientData | undefined,
  symptoms: TriageSymptom[] | undefined,
  emergencyFromLanding?: boolean,
  text?: string,
  inputType: 'text' | 'speech' = 'text',
): Promise<TriageResponse> {
  if (emergencyFromLanding) {
    const result: TriageResponse = {
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
      reviewSummary: {
        plainLanguage:
          'Es wurde ein Notfallsymptom auf der Startseite ausgewaehlt. Bitte nehmen Sie umgehend medizinische Hilfe in Anspruch.',
        professionalSummary:
          'Notfallmodus ueber die Startseite ausgewaehlt. Care Level: Notfallversorgung. Empfohlene Fachrichtung: emergency_medicine.',
      },
    }

    return result
  }

  // Wenn Freitext uebergeben wurde, wird zuerst die Symptom-Extraktion ausgefuehrt und deren Ergebnis fuer die Triage verwendet.
  if (text) {
    const extractionResult = await extractSymptoms(text, inputType)

    if (extractionResult.invalidInput) {
      throw createBadRequestError(
        extractionResult.message ?? 'Bitte beschreiben Sie konkrete gesundheitliche Beschwerden.',
      )
    }

    if (extractionResult.aiUnavailable) {
      return createTextExtractionFallbackTriage()
    }

    return requestTriageWithFallback(patientData, extractionResult.symptoms)
  }

  const triageSymptoms = symptoms ?? []

  if (triageSymptoms.length === 0) {
    return {
      careLevel: 'selfcare',
      recommendedSpecialty: 'home_care',
      reasons: [],
      reviewSummary: {
        plainLanguage:
          'Es wurden keine konkreten Beschwerden uebergeben. Eine medizinische Ersteinschaetzung ist dadurch nur eingeschraenkt moeglich.',
        professionalSummary:
          'Keine Symptome uebergeben. Care Level: Selbstversorgung. Empfohlene Fachrichtung: home_care.',
      },
    }
  }

<<<<<<< HEAD
  return requestTriageFromAi(patientData, triageSymptoms)
}
=======
  return requestTriageWithFallback(patientData, triageSymptoms)
}
>>>>>>> dev
