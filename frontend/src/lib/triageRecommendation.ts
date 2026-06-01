import { apiClient } from "./apiClient";
import type { PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import type { TriageRequest, TriageResult } from "../types/triage";

export function buildTriageRequest({
  patientData,
  selectedSymptoms,
  symptomDetails,
  freeText,
}: {
  patientData: PatientData | null;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
  freeText?: string;
}): TriageRequest {
  return {
    patientData,
    selectedSymptoms,
    symptomDetails,
    freeText,
  };
}

export async function requestTriageRecommendation(payload: TriageRequest) {
  return apiClient.post<TriageResult>("/triage/recommendation", payload);
}
