export type CareLevel = "emergency" | "doctor" | "selfcare";

export type MedicalSpecialty =
  | "home_care"
  | "emergency_medicine"
  | "general_practice"
  | "internal_medicine"
  | "cardiology"
  | "neurology"
  | "orthopedics"
  | "gastroenterology"
  | "pulmonology"
  | "dermatology"
  | "urology"
  | "gynecology"
  | "psychiatry"
  | "pediatrics"
  | "dentistry"
  | "ophthalmology"
  | "otolaryngology";

export interface ResultConfig {
  title: string;
  color: string;
  bgColor: string;
  description: string;
}
