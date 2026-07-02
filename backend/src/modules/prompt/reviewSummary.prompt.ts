import type { PatientData } from '../../../../shared/patientData.types.js'
import type { TriageSymptom } from '../../../../shared/symptom.types.js'
import type { TriageResponse } from '../triage/triage.types.js'

type ReviewSummaryPromptInput = {
    patientData?: PatientData
    symptoms: TriageSymptom[]
  triage: Pick<TriageResponse, 'careLevel' | 'recommendedSpecialty' | 'reasons'>
}

export const reviewSummaryInstructions = [
  'Du erstellst eine medizinische Review Summary fuer eine digitale Ersteinschaetzung.',
  'Erstelle genau zwei Texte: eine laienverstaendliche Zusammenfassung und eine medizinisch strukturierte Zusammenfassung.',
  'Die laienverstaendliche Zusammenfassung muss ruhig, klar und ohne Fachjargon formuliert sein.',
  'Die medizinisch strukturierte Zusammenfassung darf medizinische Begriffe verwenden, soll aber keine Diagnose erfinden.',
  'Erfinde keine Symptome, Risiken, Patientendaten oder Befunde.',
  'Nutze nur die uebergebenen Daten.',
  'Formuliere auf Deutsch.',
  'Verwende korrekte deutsche Umlaute und keine ASCII-Umschreibungen mit ae, oe oder ue.',
  'Antworte ausschliesslich im vorgegebenen JSON-Format.',
].join('\n')

export function createReviewSummaryPrompt(input: ReviewSummaryPromptInput): string {
  return [
    'Triage-Ergebnis:',
    JSON.stringify(input.triage),
    '',
    'Patientendaten:',
    JSON.stringify(input.patientData ?? null),
    '',
    'Symptome:',
    JSON.stringify(input.symptoms),
  ].join('\n')
}
