import type { PatientData } from "../../../shared/patientData.types";
import type { TriageSymptom } from "../../../shared/symptom.types";

export type { TriageSymptom } from "../../../shared/symptom.types";

export type SymptomMeasurementType = "pain" | "temperature" | "feeling" | "severity";

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: TriageSymptom[];
  symptomDetails: TriageSymptom[];
}
