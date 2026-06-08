// Recommendend Levels
export const CARE_LEVELS = ["selfcare", "doctor", "specialist", "emergency"] as const;

export type CareLevel = (typeof CARE_LEVELS)[number];

// Defined list of specialists
export const MEDICAL_SPECIALTIES = [
    "home_care",
    "emergency_medicine",
    "general_practice",
    "internal_medicine",
    "cardiology",
    "neurology",
    "orthopedics",
    "gastroenterology",
    "pulmonology",
    "dermatology",
    "urology",
    "gynecology",
    "psychiatry",
    "pediatrics",
    "dentistry",
    "ophthalmology",
    "otolaryngology",
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];

export interface RecommendedSpecialty {
  specialty: MedicalSpecialty;
  label: string;
  reason: string;
  priority: number;
}

// Visual result portrayed in frontend
export interface ResultConfig {
  title: string;
  color: string;
  bgColor: string;
  description: string;
}
