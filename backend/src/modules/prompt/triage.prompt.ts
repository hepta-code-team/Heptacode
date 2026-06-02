import { medicalSpecialtySchema } from '../triage/triage.types.js'

export const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
  'Erlaubte careLevel-Werte sind ausschliesslich: emergency, doctor, selfcare, specialist.',
  `Erlaubte recommendedSpecialty-Werte sind ausschliesslich: ${medicalSpecialtySchema.options.join(', ')}.`,
  'Setze recommendedSpecialty nur dann, wenn careLevel = specialist ist.',
  'Wenn careLevel = specialist ist, muss recommendedSpecialty genau eine passende fachaerztliche Disziplin aus der erlaubten Liste sein.',
  'Wenn careLevel = emergency, doctor oder selfcare ist, lasse recommendedSpecialty leer oder setze null.',
  'Beruecksichtige die uebergebenen Symptome, Messwerte, Dauern und die Stammdaten.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko waehle die hoehere Versorgungsebene.',
  'Gib in reasons kurze, konkrete Begruendungen auf Deutsch zurueck.',
  'Gib reviewSummary mit plainLanguage und professionalSummary auf Deutsch zurueck.',
  'Erfinde keine zusaetzlichen Symptome oder Stammdaten.',
].join('\n')

type TriagePromptInput = {
  patientDataText: string
  symptomsText: string
}

export function createTriagePrompt(input: TriagePromptInput): string {
  return [
    'Stammdaten:',
    input.patientDataText,
    '',
    'Symptome:',
    input.symptomsText,
  ].join('\n')
}