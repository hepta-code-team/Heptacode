import type { PatientData, SelectedSymptom, Symptom } from "./assessment";

export type CareLevel = "emergency" | "doctor" | "specialist" | "selfcare";

export type DoctorSpecialty =
  | "primary_care"
  | "dermatology"
  | "cardiology"
  | "pulmonology"
  | "neurology"
  | "gynecology"
  | "urology"
  | "orthopedics"
  | "gastroenterology"
  | "psychiatry"
  | "ent"
  | "emergency";

export interface RecommendedSpecialty {
  specialty: DoctorSpecialty;
  label: string;
  reason: string;
  priority: number;
}

export interface TriageRequest {
  patientData: PatientData | null;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
  freeText?: string;
}

export interface TriageResult {
  careLevel: CareLevel;
  title: string;
  color: string;
  bgColor: string;
  description: string;
  reasons: string[];
  recommendedSpecialties?: RecommendedSpecialty[];
}

export const TRIAGE_CONFIGS: Record<
  CareLevel,
  Omit<TriageResult, "careLevel" | "reasons" | "recommendedSpecialties">
> = {
  emergency: {
    title: "Begeben Sie sich umgehend in die Notaufnahme oder wählen Sie die 112.",
    color: "#FF2546",
    bgColor: "#ffcdcd",
    description: "Ihre Angaben können auf einen medizinischen Notfall hinweisen.",
  },
  doctor: {
    title: "Kontaktieren Sie Ihren Hausarzt",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    description: "Ihre Symptome sollten zeitnah ärztlich abgeklärt werden.",
  },
  specialist: {
    title: "Eine fachärztliche Abklärung kann sinnvoll sein",
    color: "#486284",
    bgColor: "#E8EEF5",
    description: "Aufgrund Ihrer Angaben kann eine spezialisierte ärztliche Abklärung sinnvoll sein.",
  },
  selfcare: {
    title: "Häusliche Versorgung",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description: "Ihre Symptome können voraussichtlich zunächst beobachtet werden.",
  },
};
