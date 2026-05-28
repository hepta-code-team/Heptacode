import {
  CARE_LEVELS,
  MEDICAL_SPECIALTIES,
  type CareLevel,
  type MedicalSpecialty,
  type ResultConfig,
} from "../../../../shared/result.types";

export interface TriageResult extends ResultConfig {
  careLevel: CareLevel;
  recommendedSpecialty?: MedicalSpecialty;
  titleSupplement?: string;
  reasons: string[];
}

export type BasicCareLevel = Exclude<CareLevel, "specialist">;

export function isCareLevel(value: string | null): value is CareLevel {
  return value !== null && CARE_LEVELS.includes(value as CareLevel);
}

export function isMedicalSpecialty(value: string | null): value is MedicalSpecialty {
  return value !== null && MEDICAL_SPECIALTIES.includes(value as MedicalSpecialty);
}

export const MEDICAL_SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  home_care: "Häusliche Versorgung",
  emergency_medicine: "Notfallmedizin",
  general_practice: "Hausärztliche Versorgung",
  internal_medicine: "Innere Medizin",
  cardiology: "Kardiologie",
  neurology: "Neurologie",
  orthopedics: "Orthopädie",
  gastroenterology: "Gastroenterologie",
  pulmonology: "Pneumologie",
  dermatology: "Dermatologie",
  urology: "Urologie",
  gynecology: "Gynäkologie",
  psychiatry: "Psychiatrie",
  pediatrics: "Pädiatrie",
  dentistry: "Zahnmedizin",
  ophthalmology: "Augenheilkunde",
  otolaryngology: "Hals-Nasen-Ohren-Heilkunde",
};

export const MEDICAL_SPECIALTY_EXPLANATIONS: Partial<Record<MedicalSpecialty, string>> = {
  home_care: "Selbstversorgung und Beobachtung",
  emergency_medicine: "Akute Notfallversorgung",
  general_practice: "Erste ärztliche Abklärung",
  internal_medicine: "Erkrankungen der inneren Organe",
  cardiology: "Herzmedizin",
  neurology: "Nervenheilkunde",
  orthopedics: "Knochen und Gelenke",
  gastroenterology: "Magen-Darm-Heilkunde",
  pulmonology: "Lungenheilkunde",
  dermatology: "Hautheilkunde",
  urology: "Harnwege und männliche Geschlechtsorgane",
  gynecology: "Frauenheilkunde",
  psychiatry: "Seelische Gesundheit",
  pediatrics: "Kinder- und Jugendmedizin",
};

export function createSpecialtyConfig(
  specialty: MedicalSpecialty,
): Omit<TriageResult, "careLevel" | "reasons" | "recommendedSpecialty"> {
  const specialtyLabel = MEDICAL_SPECIALTY_LABELS[specialty];
  const specialtyExplanation = MEDICAL_SPECIALTY_EXPLANATIONS[specialty];

  return {
    title: `Fachärztliche Versorgung: ${specialtyLabel}`,
    titleSupplement: specialtyExplanation,
    color: "#3B82F6",
    bgColor: "#cee5ff",
    description:
      `Ihre Angaben sprechen für eine fachärztliche Abklärung im Bereich ${specialtyLabel}. ` +
      "Bitte lassen Sie Ihre Beschwerden gezielt durch eine passende Fachstelle einordnen.",
  };
}

export const TRIAGE_CONFIGS: Record<BasicCareLevel, Omit<TriageResult, "careLevel" | "reasons">> = {
  emergency: {
    title: "Begeben Sie sich umgehend in die Notaufnahme oder wählen Sie die 112.",
    color: "#FF2546",
    bgColor: "#ffcdcd",
    description:
      "Aufgrund Ihrer Angaben empfehlen wir dringend, sofort den Notruf 112 zu wählen. " +
      "Ihre Symptome deuten auf einen medizinischen Notfall hin, der sofortige professionelle Hilfe erfordert.",
  },
  doctor: {
    title: "Kontaktieren Sie Ihren Hausarzt",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    description:
      "Ihre Symptome sollten zeitnah ärztlich abgeklärt werden. Bitte vereinbaren Sie einen Termin bei Ihrem Hausarzt " +
      "oder besuchen Sie eine ärztliche Bereitschaftspraxis.",
  },
  selfcare: {
    title: "Häusliche Versorgung",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description:
      "Ihre Symptome können voraussichtlich zu Hause behandelt werden. Achten Sie auf ausreichend Ruhe, Flüssigkeitszufuhr und beobachten Sie Ihren Zustand. Bei Verschlechterung suchen Sie bitte einen Arzt auf.",
  },
};
