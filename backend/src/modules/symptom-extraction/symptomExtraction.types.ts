import { z } from 'zod'

// Typ für das ausgewählte Symptom
export interface SelectedSymptom {
  region: string
  side?: string
  painLevel?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}

// Typ für die Anfrage
export interface SymptomExtractionRequest {
  symptomText?: string
  text: string
  input?: string
  inputType?: 'text' | 'speech'
}

// Typ für die Antwort
export interface SymptomExtractionResponse {
  text: string
  inputType: 'text' | 'speech'
  symptoms: SelectedSymptom[]
  invalidInput?: boolean
  // TA 1.8: true bedeutet, dass keine KI-Antwort rechtzeitig oder strukturiert verfuegbar war.
  aiUnavailable?: boolean
  message?: string
}

// Schema für das ausgewählte Symptom
export const selectedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().min(1).optional(),
  // Passt zur aktuellen Frontend-Schmerzskala, die ganze Zahlen von 1 bis 10 verwendet.
  painLevel: z.number().int().min(1).max(10).optional(),
  duration: z.enum(['today', 'days', 'week', 'weeks']).optional(),
})

// Strict AI output contract: Das Model darf nur bis zu drei frontend-kompatible Symptome zurückgeben.
export const symptomExtractionAiResultSchema = z.object({
  symptoms: z.array(selectedSymptomSchema).max(3),
})

// Strict AI output contract: Das Model bewertet, ob überhaupt medizinisch sinnvoller Freitext vorliegt.
export const symptomInputValidationAiResultSchema = z.object({
  isValidMedicalInput: z.boolean(),
  reason: z.string().min(1),
})

// Also ich habe hier symptomText hinzugefügt da wir das in TA1.4 haben wollen.
export const symptomExtractionRequestSchema = z
  .object({
    symptomText: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).optional(),
    input: z.string().trim().min(1).optional(),
    inputType: z.enum(['text', 'speech']).optional(),
  })
  .refine((value) => Boolean(value.symptomText ?? value.text ?? value.input), {
    message: 'symptomText is required',
    path: ['symptomText'],
  })
