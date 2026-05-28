import type { PatientData } from "../../../shared/patientData.types";
export type { PatientData } from "../../../shared/patientData.types";
import type {
  SelectedSymptom,
  SymptomMeasurementType,
  TriageSymptom,
  TriageSymptomDuration,
} from "../../../shared/symptom.types";
export type {
  SelectedSymptom,
  SymptomMeasurementType,
  TriageSymptom,
  TriageSymptomDuration,
} from "../../../shared/symptom.types";

export type CareLevel = "emergency" | "doctor" | "selfcare";

export interface SymptomDraft extends TriageSymptom {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
}

export interface SymptomDetailPayload extends TriageSymptom {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  duration: TriageSymptomDuration;
}

export type Symptom = SymptomDetailPayload;

export interface AssessmentPayload {
  patientData: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: SymptomDetailPayload[];
}

export interface AssessmentResult {
  careLevel: CareLevel;
  reasons: string[];
  summary?: string;
  createdAt?: string;
}

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: SymptomDetailPayload[];
}
