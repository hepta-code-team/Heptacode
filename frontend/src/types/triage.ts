import type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
  ResultConfig,
} from "../../../shared/result.types";
import {
  MEDICAL_SPECIALTY_LABELS,
  createSpecialtyConfig,
  isMedicalSpecialty,
  TRIAGE_CONFIGS,
} from "../features/results/result.config";

export type {
  CareLevel,
  MedicalSpecialty,
  RecommendedSpecialty,
  ResultConfig,
} from "../../../shared/result.types";

export {
  MEDICAL_SPECIALTY_LABELS,
  createSpecialtyConfig,
  isMedicalSpecialty,
  TRIAGE_CONFIGS,
};

export interface TriageResult extends ResultConfig {
  careLevel: CareLevel;
  recommendedSpecialty?: MedicalSpecialty;
  titleSupplement?: string;
  reasons: string[];
  recommendedSpecialties?: RecommendedSpecialty[];
}

export interface TriageRequest {
  patientData: unknown;
  selectedSymptoms: unknown[];
  symptomDetails: unknown[];
  freeText?: string;
}
