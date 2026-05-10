export interface PatientData {
  birthMonth: string;
  birthYear: string;
  height: string;
  weight: string;
  gender: string;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  allergies: string;
  medications: string;
  substanceInfluence: string;
  recentAbroad: boolean;
  recentAbroadDetails: string;
  conditions: string[];
}

export interface SelectedSymptom {
  region: string;
  side?: string;
}

export interface Symptom {
  id: string;
  region: string;
  side?: string;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  duration: string;
  active: boolean;
}

export type SymptomMeasurementType = "pain" | "temperature" | "feeling" | "severity";

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}
