export const CARE_LEVELS = ["selfcare", "doctor", "specialist", "emergency"] as const;

export type CareLevel = (typeof CARE_LEVELS)[number];

export const MEDICAL_SPECIALTIES = [
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

export interface ResultConfig {
  title: string;
  color: string;
  bgColor: string;
  description: string;
}
