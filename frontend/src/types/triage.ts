export type CareLevel = "selfcare" | "doctor" | "specialist" | "emergency";

export type MedicalSpecialty =
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

// This creates the visual result card displayed on the last page
export interface TriageResult {
  careLevel: CareLevel;
  recommendedSpecialty?: MedicalSpecialty;
  title: string;
  titleSupplement?: string;
  color: string;
  bgColor: string;
  description: string;
  reasons: string[];
}

export const CARE_LEVELS: CareLevel[] = ["selfcare", "doctor", "specialist", "emergency"];

export function isCareLevel(value: string | null): value is CareLevel {
  return value !== null && CARE_LEVELS.includes(value as CareLevel);
}

export const MEDICAL_SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
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

export function isMedicalSpecialty(value: string | null): value is MedicalSpecialty {
  return value !== null && value in MEDICAL_SPECIALTY_LABELS;
}

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

export const TRIAGE_CONFIGS: Record<CareLevel, Omit<TriageResult, "careLevel" | "reasons">> = {
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
  specialist: {
    title: "Fachärztliche Versorgung",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    description:
      "Ihre Beschwerden sollten gezielt fachärztlich abgeklärt werden. Die passende Fachrichtung ergibt sich aus Ihren Angaben.",
  },
  selfcare: {
    title: "Häusliche Versorgung",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description:
      "Ihre Symptome können voraussichtlich zu Hause behandelt werden. Achten Sie auf ausreichend Ruhe, Flüssigkeitszufuhr und beobachten Sie Ihren Zustand. Bei Verschlechterung suchen Sie bitte einen Arzt auf.",
  },
};
