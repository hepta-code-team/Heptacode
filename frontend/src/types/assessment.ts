import type { PatientData } from "../../../shared/patientData.types";
export type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom } from "../../../shared/symptom.types";
import type { CareLevel, MedicalSpecialty, RecommendedSpecialty } from "../../../shared/result.types";
export type { CareLevel, MedicalSpecialty, RecommendedSpecialty } from "../../../shared/result.types";

export type SymptomMeasurementType = "pain" | "temperature" | "feeling" | "severity";

export interface SymptomDetailPayload {
  id: string;
  region: string;
  side?: string;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  duration: string;
  active: boolean;
}

export type SelectedSymptom = TriageSymptom;

export interface Symptom extends TriageSymptom {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
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
  reviewSummary: {
    plainLanguage: string;
    professionalSummary: string;
  };
  recommendedSpecialties?: RecommendedSpecialty[];
  summary?: string;
  aiUnavailable?: boolean;
  createdAt?: string;
}

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}
