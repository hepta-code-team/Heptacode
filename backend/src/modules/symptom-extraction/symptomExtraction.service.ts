import { aiClient } from '../../ai/client.js'
import { checkRedFlags } from '../redflags/redflag.service.js'
import type {
  SelectedSymptom,
  SymptomExtractionResponse,
} from './symptomExtraction.types.js'

const REGION_KEYWORDS: ReadonlyArray<{ keyword: string; symptom: SelectedSymptom }> = [
  { keyword: 'kopf', symptom: { region: 'Kopf' } },
  { keyword: 'brust', symptom: { region: 'Brust' } },
  { keyword: 'bauch', symptom: { region: 'Bauch' } },
  { keyword: 'rücken', symptom: { region: 'Rücken' } },
  { keyword: 'arm', symptom: { region: 'Arm' } },
  { keyword: 'bein', symptom: { region: 'Bein' } },
  { keyword: 'psych', symptom: { region: 'Psychische Probleme' } },
]

function inferSymptoms(input: string): SelectedSymptom[] {
  const normalizedInput = input.toLowerCase()

  return REGION_KEYWORDS.filter(({ keyword }) => normalizedInput.includes(keyword)).map(
    ({ symptom }) => symptom,
  )
}

export async function extractSymptoms(
  input: string,
  inputType: 'text' | 'speech' = 'text',
): Promise<SymptomExtractionResponse> {
  void aiClient

  const redFlagResult = checkRedFlags(input)

  return {
    input,
    inputType,
    suggestions: inferSymptoms(input),
    redFlags: redFlagResult.matches,
  }
}
