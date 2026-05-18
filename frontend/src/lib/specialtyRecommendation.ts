import type { PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import type { DoctorSpecialty, RecommendedSpecialty, TriageResult } from "../types/triage";

const SPECIALTY_LABELS: Record<DoctorSpecialty, string> = {
  primary_care: "Hausarzt / Allgemeinmedizin",
  dermatology: "Dermatologie",
  cardiology: "Kardiologie",
  pulmonology: "Pneumologie",
  neurology: "Neurologie",
  gynecology: "Gynäkologie",
  urology: "Urologie",
  orthopedics: "Orthopädie",
  gastroenterology: "Gastroenterologie",
  psychiatry: "Psychiatrie / Psychotherapie",
  ent: "HNO",
  emergency: "Notaufnahme / Notruf",
};

function textOf(symptom: Symptom | SelectedSymptom) {
  const sides = "sides" in symptom && symptom.sides?.length ? symptom.sides.join(" ") : symptom.side ?? "";
  return `${symptom.region} ${sides}`.toLowerCase();
}

function addSpecialty(
  map: Map<DoctorSpecialty, RecommendedSpecialty>,
  specialty: DoctorSpecialty,
  reason: string,
  priority: number
) {
  const current = map.get(specialty);

  if (!current || priority > current.priority) {
    map.set(specialty, {
      specialty,
      label: SPECIALTY_LABELS[specialty],
      reason,
      priority,
    });
  }
}

export function getFrontendTriageRecommendation({
  patientData,
  selectedSymptoms,
  symptomDetails,
}: {
  patientData: PatientData | null;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}): TriageResult {
  const specialties = new Map<DoctorSpecialty, RecommendedSpecialty>();
  const allTexts = [...selectedSymptoms.map(textOf), ...symptomDetails.map(textOf)].join(" ");
  const maxValue = symptomDetails.length ? Math.max(...symptomDetails.map((symptom) => symptom.measurementValue)) : 0;

  if (
    allTexts.includes("atemnot") ||
    allTexts.includes("druckgefühl") ||
    allTexts.includes("enge") ||
    allTexts.includes("suizidgedanken") ||
    allTexts.includes("vaginale blutung") ||
    maxValue >= 9
  ) {
    addSpecialty(specialties, "emergency", "Ein kritisches Warnsymptom wurde angegeben.", 100);
  }

  if (allTexts.includes("brust") || allTexts.includes("herzrasen") || allTexts.includes("herzstechen")) {
    addSpecialty(specialties, "cardiology", "Beschwerden im Brust- oder Herzbereich können kardiologisch relevant sein.", 85);
  }

  if (allTexts.includes("atemnot") || allTexts.includes("schmerz beim einatmen")) {
    addSpecialty(specialties, "pulmonology", "Atembezogene Beschwerden können eine Lungenabklärung erfordern.", 80);
  }

  if (allTexts.includes("haut") || allTexts.includes("juckreiz") || allTexts.includes("sonnenbrand") || allTexts.includes("verbrennung") || allTexts.includes("rötung")) {
    addSpecialty(specialties, "dermatology", "Haut-, Juckreiz-, Rötungs- oder Verbrennungsbeschwerden passen zur Dermatologie.", 75);
  }

  if (allTexts.includes("kopf") || allTexts.includes("taubheit") || allTexts.includes("kribbeln") || allTexts.includes("sehstörungen") || allTexts.includes("verwirrtheit")) {
    addSpecialty(specialties, "neurology", "Neurologische Beschwerden wie Taubheit, Verwirrtheit oder Sehstörungen sollten neurologisch eingeordnet werden.", 75);
  }

  if (allTexts.includes("nase") || allTexts.includes("mund") || allTexts.includes("rachen") || allTexts.includes("ohr")) {
    addSpecialty(specialties, "ent", "Beschwerden an Nase, Ohr, Mund oder Rachen passen zur HNO-Abklärung.", 65);
  }

  if (allTexts.includes("rücken") || allTexts.includes("nacken") || allTexts.includes("bein") || allTexts.includes("arm") || allTexts.includes("sportverletzung")) {
    addSpecialty(specialties, "orthopedics", "Beschwerden an Rücken, Armen, Beinen oder nach Sportverletzung passen zur Orthopädie.", 60);
  }

  if (allTexts.includes("bauch") || allTexts.includes("oberbauch") || allTexts.includes("unterbauch") || allTexts.includes("krämpfe") || allTexts.includes("koliken")) {
    addSpecialty(specialties, "gastroenterology", "Bauchbeschwerden, Krämpfe oder Koliken können gastroenterologisch relevant sein.", 60);
  }

  if (allTexts.includes("urin") || allTexts.includes("hoden") || allTexts.includes("glied") || allTexts.includes("vorhaut") || allTexts.includes("flanke")) {
    addSpecialty(specialties, "urology", "Beschwerden beim Wasserlassen, an Hoden/Glied oder Flankenschmerzen passen zur Urologie.", 70);
  }

  if (patientData?.gender.toLowerCase().startsWith("weib") || patientData?.isPregnant || patientData?.isBreastfeeding) {
    if (allTexts.includes("intimbereich") || allTexts.includes("zyklus") || allTexts.includes("vaginal") || allTexts.includes("ausfluss") || allTexts.includes("brustwarzen")) {
      addSpecialty(specialties, "gynecology", "Gynäkologische oder schwangerschafts-/stillzeitbezogene Beschwerden wurden angegeben.", 80);
    }
  }

  if (allTexts.includes("angst") || allTexts.includes("panik") || allTexts.includes("sucht") || allTexts.includes("niedergeschlagenheit")) {
    addSpecialty(specialties, "psychiatry", "Psychische Beschwerden oder Substanzverlangen können psychiatrisch/psychotherapeutisch relevant sein.", 65);
  }

  if (specialties.size === 0) {
    addSpecialty(specialties, "primary_care", "Keine eindeutige Fachrichtung erkennbar. Der Hausarzt ist als erste Anlaufstelle sinnvoll.", 30);
  }

  const recommendedSpecialties = Array.from(specialties.values()).sort((a, b) => b.priority - a.priority);
  const topSpecialty = recommendedSpecialties[0];

  const careLevel =
    topSpecialty.specialty === "emergency"
      ? "emergency"
      : topSpecialty.specialty === "primary_care"
        ? maxValue >= 5
          ? "doctor"
          : "selfcare"
        : "specialist";

  return {
    careLevel,
    title:
      careLevel === "specialist"
        ? `Empfohlene Fachrichtung: ${topSpecialty.label}`
        : topSpecialty.label,
    color:
      careLevel === "emergency"
        ? "#FF2546"
        : careLevel === "specialist"
          ? "#486284"
          : careLevel === "doctor"
            ? "#F59E0B"
            : "#10B981",
    bgColor:
      careLevel === "emergency"
        ? "#ffcdcd"
        : careLevel === "specialist"
          ? "#E8EEF5"
          : careLevel === "doctor"
            ? "#FEF3C7"
            : "#D1FAE5",
    description:
      careLevel === "specialist"
        ? "Diese Empfehlung ist eine frontendseitige Vorab-Einschätzung und wird später durch Backend/KI ersetzt."
        : "Diese Empfehlung ist eine vorläufige Einschätzung und ersetzt keine medizinische Diagnose.",
    reasons: recommendedSpecialties.map((specialty) => specialty.reason),
    recommendedSpecialties,
  };
}
