import { medicalSpecialtySchema } from '../triage/triage.types.js'

export const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
  'Erlaubte careLevel-Werte sind ausschliesslich: emergency, doctor, selfcare, specialist.',
  `Erlaubte recommendedSpecialty-Werte sind ausschliesslich: ${medicalSpecialtySchema.options.join(', ')}.`,
  'Setze recommendedSpecialty nur dann, wenn careLevel = specialist ist.',
  'Wenn careLevel = specialist ist, muss recommendedSpecialty genau eine passende fachaerztliche Disziplin aus der erlaubten Liste sein.',
  'Wenn careLevel = emergency, doctor oder selfcare ist, lasse recommendedSpecialty leer oder setze null.',
  'Waehle doctor nur, wenn eine allgemeinmedizinische oder hausaerztliche Ersteinschaetzung fachlich passender ist als eine direkte fachaerztliche Abklaerung.',
  'Waehle specialist, wenn eine direkte fachaerztliche Abklaerung fachlich naheliegender ist als eine allgemeinaerztliche Ersteinschaetzung.',
  'Wenn du specialist waehlst, entscheide frei anhand der medizinischen Angaben, welche Disziplin aus der erlaubten recommendedSpecialty-Liste am besten passt.',
  'Wenn reasons, plainLanguage oder professionalSummary eine fachaerztliche Disziplin empfehlen oder namentlich nennen, muss careLevel = specialist sein und recommendedSpecialty muss dazu passen.',
  'Nutze general_practice nicht als Ersatz fuer specialist. Nutze general_practice nur, wenn careLevel nicht specialist ist.',
  'Beruecksichtige die uebergebenen Symptome, Zusatzdetails, Messwerte, Dauern und die Stammdaten.',
  'Nutze das uebergebene aktuelle Datum als Bezugsdatum fuer Altersberechnungen aus Geburtsmonat und Geburtsjahr.',
  'Zusatzdetails koennen fuer die Dringlichkeit entscheidend sein, zum Beispiel Verbrennungsursache, Hitzequelle, Fremdkoerper steckt tief oder steckt explizit nicht mehr, Blutung, offene Wunde oder Negationen.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko waehle die hoehere Versorgungsebene.',
  'Gib in reasons kurze, konkrete Begruendungen auf Deutsch zurueck.',
  'Gib reviewSummary mit plainLanguage und professionalSummary auf Deutsch zurueck.',
  'Erfinde keine zusaetzlichen Symptome oder Stammdaten.',
].join('\n')

type TriagePromptInput = {
  currentDateText: string
  patientDataText: string
  symptomsText: string
}

export function createTriagePrompt(input: TriagePromptInput): string {
  return [
    'Aktuelles Datum:',
    input.currentDateText,
    '',
    'Stammdaten:',
    input.patientDataText,
    '',
    'Symptome:',
    input.symptomsText,
  ].join('\n')
}
