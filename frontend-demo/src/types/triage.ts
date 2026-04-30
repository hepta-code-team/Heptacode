export type CareLevel = "emergency" | "doctor" | "selfcare";

export interface TriageResult {
  careLevel: CareLevel;
  title: string;
  color: string;
  bgColor: string;
  description: string;
  reasons: string[];
}

export const TRIAGE_CONFIGS: Record<CareLevel, Omit<TriageResult, "careLevel" | "reasons">> = {
  emergency: {
    title: "Begeben Sie sich umgehend in die Notaufnahme oder wählen Sie die 112.",
    color: "#FF2546",
    bgColor: "#ffcdcd",
    description:
      "Aufgrund Ihrer Angaben empfehlen wir dringend, sofort den Notruf 112 zu wählen. Ihre Symptome deuten auf einen medizinischen Notfall hin, der sofortige professionelle Hilfe erfordert.",
  },
  doctor: {
    title: "Kontaktieren Sie Ihren Hausarzt",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    description:
      "Ihre Symptome sollten zeitnah ärztlich abgeklärt werden. Bitte vereinbaren Sie einen Termin bei Ihrem Hausarzt oder besuchen Sie eine ärztliche Bereitschaftspraxis.",
  },
  selfcare: {
    title: "Häusliche Versorgung",
    color: "#10B981",
    bgColor: "#D1FAE5",
    description:
      "Ihre Symptome können voraussichtlich zu Hause behandelt werden. Achten Sie auf ausreichend Ruhe, Flüssigkeitszufuhr und beobachten Sie Ihren Zustand. Bei Verschlechterung suchen Sie bitte einen Arzt auf.",
  },
};
