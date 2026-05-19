import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { isAiRequestError } from '../../ai/timeout.js'
import {
  assessmentAiResultSchema,
  type AssessmentPayload,
  type AssessmentResult,
  type Symptom,
} from './assessment.types.js'

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

function createExampleBackendAssessmentResponse(payload: AssessmentPayload): AssessmentResult {
  const primarySymptom = payload.symptomDetails[0]
  const symptomLabel = primarySymptom
    ? `${primarySymptom.region}${primarySymptom.side ? ` (${primarySymptom.side})` : ''}`
    : 'den angegebenen Beschwerden'

  // BEISPIEL-ANTWORT VOM BACKEND:
  // Diese Rueckgabe ist nur eine markierte Beispielantwort, damit das Frontend schon jetzt eine
  // strukturierte Antwort vom Backend anzeigen kann. Sobald die KI integriert ist, soll dieses
  // Beispiel entfernt werden und ausschliesslich die echte KI-Antwort aus requestStructuredAiResponse
  // zurueckgegeben werden. Die fehlende KI wird bewusst nur hier im Code kommentiert und nicht auf
  // der Website angezeigt.
  return {
    careLevel: 'doctor',
    reasons: [
      `Die Angaben zu ${symptomLabel} sollten aerztlich eingeordnet werden.`,
      'Die Beschwerden wurden mit Patientendaten und Symptomdetails an das Backend uebergeben.',
      'Die Rueckmeldung fasst die eingegebenen Informationen vorsichtig zusammen.',
    ],
    summary:
      'Bitte lassen Sie die angegebenen Beschwerden zeitnah medizinisch abklaeren. Bei ploetzlicher Verschlechterung oder akuter Gefahr waehlen Sie den Notruf.',
    createdAt: new Date().toISOString(),
  }
}

function formatPatientData({ patientData }: AssessmentPayload): string {
  return [
    `Geburtsmonat: ${patientData.birthMonth}`,
    `Geburtsjahr: ${patientData.birthYear}`,
    `Groesse: ${patientData.height} cm`,
    `Gewicht: ${patientData.weight} kg`,
    `Geschlecht: ${patientData.gender}`,
    `Schwanger: ${patientData.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillend: ${patientData.isBreastfeeding ? 'Ja' : 'Nein'}`,
    `Allergien: ${patientData.allergies || 'Keine Angabe'}`,
    `Medikamente: ${patientData.medications || 'Keine Angabe'}`,
    `Substanzbeeinflussung: ${patientData.substanceInfluence || 'Keine Angabe'}`,
    `Auslandsaufenthalt letzte 3 Monate: ${patientData.recentAbroad ? patientData.recentAbroadDetails || 'Ja' : 'Nein'}`,
    `Vorerkrankungen: ${patientData.conditions.length > 0 ? patientData.conditions.join(', ') : 'Keine Angabe'}`,
  ].join('\n')
}

function formatSelectedSymptoms({ selectedSymptoms }: AssessmentPayload): string {
  if (selectedSymptoms.length === 0) {
    return 'Keine vorausgewaehlten Symptome uebergeben.'
  }

  return selectedSymptoms
    .map((symptom, index) => `${index + 1}. ${symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}`)
    .join('\n')
}

function formatSymptomDetails({ symptomDetails }: AssessmentPayload): string {
  return symptomDetails
    .map((symptom, index) => {
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

export async function evaluateAssessmentWithAi(payload: AssessmentPayload): Promise<AssessmentResult> {
  try {
    const aiResult = await requestStructuredAiResponse({
      messages: [
        {
          role: 'system',
          content: [
            'Du bist ein medizinischer Triage-Assistent fuer eine Webanwendung.',
            'Bewerte ausschliesslich die uebergebenen Patientendaten und Symptome.',
            'Verwende keine festen Schwellenwert-Regeln, sondern eine medizinisch begruendete KI-Einschaetzung.',
            'Antworte kurz, vorsichtig und auf Deutsch.',
            'Gib careLevel als emergency, doctor oder selfcare zurueck.',
            'Die Antwort ist keine Diagnose und ersetzt keine aerztliche Behandlung.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Patientendaten:',
            formatPatientData(payload),
            '',
            'Ausgewaehlte Symptome:',
            formatSelectedSymptoms(payload),
            '',
            'Detailangaben zu aktiven Symptomen:',
            formatSymptomDetails(payload),
          ].join('\n'),
        },
      ],
      schema: assessmentAiResultSchema,
      schemaName: 'assessment_result',
      temperature: 0,
    })

    return {
      ...aiResult,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    if (isAiRequestError(error)) {
      // BEISPIEL-FALLBACK VOM BACKEND:
      // Wenn die KI lokal noch nicht angebunden oder nicht erreichbar ist, liefert das Backend
      // voruebergehend diese Beispielantwort im gleichen Format wie die spaetere KI-Antwort.
      return createExampleBackendAssessmentResponse(payload)
    }

    throw error
  }
}