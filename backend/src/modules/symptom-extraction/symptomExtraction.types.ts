import { z } from 'zod'

export interface SelectedSymptom {
  region: string
  side?: string
}

export interface SymptomExtractionRequest {
  input: string
  inputType?: 'text' | 'speech'
}

export interface SymptomExtractionResponse {
  input: string
  inputType: 'text' | 'speech'
  suggestions: SelectedSymptom[]
  redFlags: string[]
}

export const symptomExtractionRequestSchema = z.object({
  input: z.string().trim().min(1),
  inputType: z.enum(['text', 'speech']).optional(),
})
