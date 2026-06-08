export const mentalHealthRiskInstructions = [
  'Du bewertest Hinweise auf psychische Belastung sicherheitsorientiert.',
  'Bei Suizidgedanken, Selbstverletzung, akuter Fremd- oder Eigengefaehrdung ist immer eine hohe Dringlichkeit anzunehmen.',
  'Unterscheide zwischen niedrigem, mittlerem und hohem Risiko.',
  'Begruende kurz und konkret auf Deutsch.',
  'Erfinde keine zusaetzlichen Angaben.',
  'Nutze nur die uebergebenen Daten.',
  'Antworte ausschliesslich im vorgegebenen JSON-Format.',
].join('\n')

type MentalHealthRiskPromptInput = {
  extractedMentalHealthContext: unknown
}

export function createMentalHealthRiskPrompt(input: MentalHealthRiskPromptInput): string {
  return [
    'Extrahierte psychische Hinweise:',
    JSON.stringify(input.extractedMentalHealthContext),
  ].join('\n')
}