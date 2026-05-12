import { z } from 'zod'

export interface SelectedSymptom {
  region: string
  side?: string
}

export interface SymptomExtractionRequest {
  text: string
  inputType?: 'text' | 'speech'
}

export interface SymptomExtractionResponse {
  text: string
  inputType: 'text' | 'speech'
  symptoms: SelectedSymptom[]
}

export const selectedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
})

// Strict AI output contract: Das Model darf nur bis zu drei frontend-kompatible Symptome zurückgeben.
export const symptomExtractionAiResultSchema = z.object({
  symptoms: z.array(selectedSymptomSchema).max(3),
})

export const symptomExtractionRequestSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    input: z.string().trim().min(1).optional(),
    inputType: z.enum(['text', 'speech']).optional(),
  })
  .refine((value) => Boolean(value.text ?? value.input), {
    message: 'text is required',
    path: ['text'],
  })
