import type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom } from "../../../shared/symptom.types";

export type SymptomMeasurementType = "pain" | "temperature" | "feeling" | "severity";
export type CareLevel = "emergency" | "doctor" | "selfcare";

export interface SymptomDetailPayload {
  id: string;
  region: string;
  side?: string;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  duration: string;
  active: boolean;
}

export interface AssessmentPayload {
  patientData: PatientData;
  selectedSymptoms: TriageSymptom[];
  symptomDetails: SymptomDetailPayload[];
}

export interface AssessmentResult {
  careLevel: CareLevel;
  reasons: string[];
  summary?: string;
  createdAt?: string;
}