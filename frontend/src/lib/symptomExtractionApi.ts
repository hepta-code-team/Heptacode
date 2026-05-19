import { apiClient } from "./apiClient";
import type {
  ExtractedSymptom,
  SymptomExtractionAiResult,
} from "@heptacode/shared/symptomExtraction.types";

export type { ExtractedSymptom, SymptomExtractionAiResult };

export interface SymptomExtractionResponse {
  text: string;
  inputType: "text" | "speech";
  symptoms: ExtractedSymptom[];
  invalidInput?: boolean;
  aiUnavailable?: boolean;
  message?: string;
}

export async function extractSymptomsFromText(
  symptomText: string,
  inputType: "text" | "speech" = "text",
): Promise<SymptomExtractionResponse> {
  return apiClient.post<SymptomExtractionResponse>("/api/v1/symptoms/extraction", {
    symptomText,
    inputType,
  });
}
