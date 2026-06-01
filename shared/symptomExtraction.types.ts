import type {TriageSymptom} from "./symptom.types.js";

export const SYMPTOM_INPUT_TYPES = ['text', 'speech'] as const;

export type SymptomInputType = (typeof SYMPTOM_INPUT_TYPES)[number];


// KI-Response: Symptom-Extraktion.
export interface SymptomExtractionAiResult {
  symptoms: TriageSymptom[];
}

// KI-Response: Freitext-Validierung vor der Extraktion.
export interface SymptomInputValidationAiResult {
  isValidMedicalInput: boolean;
  reason: string;
}
