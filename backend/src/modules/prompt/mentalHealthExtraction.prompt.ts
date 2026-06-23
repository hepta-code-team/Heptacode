import type { SymptomInputType } from '../../../../shared/symptomExtraction.types.js'

type MentalHealthExtractionPromptInput = {
  text: string
  inputType: SymptomInputType
}

export const mentalHealthExtractionInstructions = [
  'Du extrahierst Hinweise auf psychische Belastung aus deutschem Freitext.',
  'Bewerte noch kein Risiko.',
  'Erkenne nur Informationen, die ausdruecklich genannt oder sehr klar ableitbar sind.',
  'Achte besonders auf Angst, Panik, Niedergeschlagenheit, Schlafprobleme, Selbstverletzung und Suizidgedanken.',
  'Erfinde keine Details.',
  'Wenn keine psychische Belastung erkennbar ist, gib eine leere Ergebnisstruktur zurueck.',
  'Formuliere auf Deutsch.',
  'Antworte ausschliesslich im vorgegebenen JSON-Format.',
].join('\n')

export function createMentalHealthExtractionPrompt(input: MentalHealthExtractionPromptInput): string {
  return [
    `Input-Typ: ${input.inputType}`,
    `Freitext: ${input.text}`,
  ].join('\n')
}