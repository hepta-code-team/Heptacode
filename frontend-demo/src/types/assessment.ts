export interface PatientData {
  birthMonth: string;
  birthYear: string;
  height: string;
  weight: string;
  gender: string;
  isPregnant: boolean;
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
  painLevel: number;
  duration: string;
  active: boolean;
}

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}
