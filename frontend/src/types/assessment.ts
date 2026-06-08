import type { PatientData } from "../../../shared/patientData.types";
import type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
} from "../../../shared/result.types";
import type {
  SelectedSymptom,
  SymptomMeasurementType,
  TriageSymptom,
  TriageSymptomDuration,
} from "../../../shared/symptom.types";

export type { PatientData } from "../../../shared/patientData.types";
export type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
} from "../../../shared/result.types";
export type {
  SelectedSymptom,
  SymptomMeasurementType,
  TriageSymptom,
  TriageSymptomDuration,
} from "../../../shared/symptom.types";

export interface ReviewSummary {
  plainLanguage: string;
  professionalSummary: string;
}

export type EditableReviewSummary = ReviewSummary;

export interface SymptomDraft extends TriageSymptom {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
  measurementValue: number;
  isNameEditable?: boolean;
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
  recommendedSpecialty: MedicalSpecialty;
  reasons: string[];
  reviewSummary: ReviewSummary;
  recommendedSpecialties?: RecommendedSpecialty[];
  summary?: string;
  aiUnavailable?: boolean;
  createdAt?: string;
  aiModel?: string;
}

export interface Assessment {
  patientData?: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: SymptomDetailPayload[];
}
