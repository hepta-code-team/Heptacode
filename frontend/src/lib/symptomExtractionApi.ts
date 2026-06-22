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

export interface SymptomInputValidationResponse {
  text: string;
  inputType: SymptomInputType;
  isValidMedicalInput: boolean;
  aiUnavailable?: boolean;
  message?: string;
}

function omitMoodFromPatientData(patientData: PatientData | undefined): PatientData | undefined {
  if (!patientData) {
    return undefined;
  }

  const { mood: _mood, ...patientDataWithoutMood } = patientData;
  return patientDataWithoutMood;
}

export async function extractSymptomsFromText(
  symptomText: string,
  inputType: SymptomInputType = "text",
  patientData?: PatientData,
): Promise<SymptomExtractionResponse> {
  return apiClient.post<SymptomExtractionResponse>("/api/v1/symptoms/extraction", {
    symptomText,
    inputType,
    patientData: omitMoodFromPatientData(patientData),
  });
}

export async function validateSymptomInput(
  symptomText: string,
  inputType: SymptomInputType = "text",
  patientData?: PatientData,
): Promise<SymptomInputValidationResponse> {
  return apiClient.post<SymptomInputValidationResponse>("/api/v1/symptoms/validation", {
    symptomText,
    inputType,
    patientData: omitMoodFromPatientData(patientData),
  });
}

export async function validateSymptomDetailInput(
  symptomText: string,
  inputType: SymptomInputType = "text",
  patientData?: PatientData,
): Promise<SymptomInputValidationResponse> {
  return apiClient.post<SymptomInputValidationResponse>("/api/v1/symptoms/detail-validation", {
    symptomText,
    inputType,
    patientData,
  });
}
