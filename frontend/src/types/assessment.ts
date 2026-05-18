import type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom } from "../../../shared/symptom.types";

export type SymptomMeasurementType = "pain" | "temperature" | "feeling" | "severity";
export type CareLevel = "emergency" | "doctor" | "selfcare";

export interface AssessmentPayload {
  patientData: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}

export interface AssessmentResult {
  careLevel: CareLevel;
  reasons: string[];
  summary?: string;
  createdAt?: string;
}

export interface Assessment {
  patientData?: PatientData;
<<<<<<< HEAD
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
  result?: AssessmentResult | null;
=======
  selectedSymptoms: TriageSymptom[];
  symptomDetails: TriageSymptom[];
>>>>>>> origin/dev
}
