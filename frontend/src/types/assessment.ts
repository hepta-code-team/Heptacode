import type { PatientData } from "../../../shared/patientData.types";
export type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom, TriageSymptomDuration } from "../../../shared/symptom.types";
import type { CareLevel, MedicalSpecialty, RecommendedSpecialty } from "../../../shared/result.types";
export type { CareLevel, MedicalSpecialty, RecommendedSpecialty } from "../../../shared/result.types";

export type SymptomMeasurementType = "pain" | "temperature" | "severity" | "feeling" | "breathing";

export interface SelectedSymptom {
  region: string;
  side?: string;
  sides?: string[];
  mainKey?: string;
  isCritical?: boolean;
}

export interface SymptomDetailPayload {
  id: string;
  region: string;
  side?: string;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  duration: TriageSymptomDuration | undefined;
  active: boolean;
}

export interface Symptom extends TriageSymptom {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
  measurementValue?: number;
}

export interface AssessmentPayload {
  patientData: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: SymptomDetailPayload[];
}

export interface AssessmentResult {
  careLevel: CareLevel;
  recommendedSpecialty?: MedicalSpecialty;
  reasons: string[];
  reviewSummary?: {
    plainLanguage: string;
    professionalSummary: string;
  };
  recommendedSpecialties?: RecommendedSpecialty[];
  aiUnavailable?: boolean;
  summary?: string;
  createdAt?: string;
}

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}
