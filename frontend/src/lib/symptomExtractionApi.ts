import { apiClient } from "./apiClient";
import type {
  SymptomExtractionAiResult,
  SymptomInputType,
} from "../../../shared/symptomExtraction.types";
import type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom } from "../../../shared/symptom.types";

export type { SymptomExtractionAiResult, SymptomInputType, TriageSymptom };

export interface SymptomExtractionResponse {
  text: string;
  inputType: SymptomInputType;
  symptoms: TriageSymptom[];
  invalidInput?: boolean;
  aiUnavailable?: boolean;
  message?: string;
}

export async function extractSymptomsFromText(
  symptomText: string,
  inputType: SymptomInputType = "text",
  patientData?: PatientData,
): Promise<SymptomExtractionResponse> {
  return apiClient.post<SymptomExtractionResponse>("/api/v1/symptoms/extraction", {
    symptomText,
    inputType,
    patientData,
  });
}
