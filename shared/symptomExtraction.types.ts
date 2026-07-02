import type {TriageSymptom} from "./symptom.types.js";

export const SYMPTOM_INPUT_TYPES = ['text', 'speech'] as const;

export type SymptomInputType = (typeof SYMPTOM_INPUT_TYPES)[number];


// AI response for symptom extraction.
export interface SymptomExtractionAiResult {
  symptoms: TriageSymptom[];
}

// AI response for free-text validation before extraction.
export interface SymptomInputValidationAiResult {
  isValidMedicalInput: boolean;
  reason: string;
}
