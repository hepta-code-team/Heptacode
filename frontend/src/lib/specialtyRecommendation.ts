import type { PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import {
  MEDICAL_SPECIALTY_LABELS,
  createSpecialtyConfig,
} from "../types/triage";
import type { MedicalSpecialty, RecommendedSpecialty, TriageResult } from "../types/triage";

const SPECIALTY_LABELS: Record<MedicalSpecialty, string> = MEDICAL_SPECIALTY_LABELS;

function normalize(value: string) {
  return value.toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function textOf(symptom: Symptom | SelectedSymptom) {
  return normalize(`${symptom.region} ${symptom.side ?? ""}`);
}

function addSpecialty(
  map: Map<MedicalSpecialty, RecommendedSpecialty>,
  specialty: MedicalSpecialty,
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

function hasAdministrativeRequest(text: string) {
  return includesAny(text, ["rezept", "krankmeldung", "au-bescheinigung"]);
}

function hasPsychRequest(text: string) {
  return includesAny(text, [
    "psych",
    "angst",
    "panik",
    "sucht",
    "substanzverlangen",
    "niedergeschlagenheit",
    "suizid",
  ]);
}

function hasHighSuicidalIdeation(symptomDetails: Symptom[]) {
  return symptomDetails.some((symptom) => textOf(symptom).includes("suizid") && (symptom.measurementValue ?? 0) >= 8);
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
  const specialties = new Map<MedicalSpecialty, RecommendedSpecialty>();
  const allTexts = [...selectedSymptoms.map(textOf), ...symptomDetails.map(textOf)].join(" ");
  const maxValue = symptomDetails.length ? Math.max(...symptomDetails.map((symptom) => symptom.measurementValue ?? 0)) : 0;

  const administrativeRequest = hasAdministrativeRequest(allTexts);

  if (administrativeRequest) {
    const recommendation: RecommendedSpecialty = {
      specialty: "general_practice",
      label: SPECIALTY_LABELS.general_practice,
      reason: "Für Rezeptverlängerungen oder Krankmeldungen ist der Hausarzt bzw. die Allgemeinmedizin die passende Anlaufstelle.",
      priority: 100,
    };

    return {
      careLevel: "doctor",
      title: recommendation.label,
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      description: "Für Ihr Anliegen ist eine ärztliche Versorgung über den Hausarzt sinnvoll.",
      reasons: [recommendation.reason],
      recommendedSpecialties: [recommendation],
    };
  }

  if (
    includesAny(allTexts, [
      "atemnot",
      "druckgefühl",
      "enge",
      "vaginale blutung",
      "offener bruch",
      "starke fehlstellung",
    ]) ||
    hasHighSuicidalIdeation(symptomDetails)
  ) {
    addSpecialty(specialties, "emergency_medicine", "Ein kritisches Warnsymptom wurde angegeben.", 100);
  }

  if (
    includesAny(allTexts, [
      "brust",
      "brustmitte",
      "linksseitig",
      "rechtsseitig",
      "druckgefühl",
      "enge",
      "herzrasen",
      "herzstechen",
    ])
  ) {
    addSpecialty(specialties, "cardiology", "Beschwerden im Brust- oder Herzbereich können kardiologisch relevant sein.", 85);
  }

  if (includesAny(allTexts, ["atemnot", "schmerz beim einatmen"])) {
    addSpecialty(specialties, "pulmonology", "Atembezogene Beschwerden können eine Lungenabklärung erfordern.", 80);
  }

  if (includesAny(allTexts, ["bruch", "knochenbruch", "fehlstellung", "sportverletzung", "rücken", "nacken", "bein", "arm", "gelenk"])) {
    addSpecialty(specialties, "orthopedics", "Beschwerden am Bewegungsapparat, Verletzungen oder Bruchverdacht passen zur Orthopädie.", 80);
  }

  if (includesAny(allTexts, ["haut", "juckreiz", "sonnenbrand", "verbrennung", "rötung", "ausschlag"])) {
    addSpecialty(specialties, "dermatology", "Haut-, Juckreiz-, Rötungs- oder Verbrennungsbeschwerden passen zur Dermatologie.", 75);
  }

  if (includesAny(allTexts, ["taubheit", "kribbeln", "sehstörungen", "verwirrtheit", "desorientierung", "gehirnerschütterung"])) {
    addSpecialty(specialties, "neurology", "Neurologische Beschwerden oder Kopfverletzungen sollten neurologisch eingeordnet werden.", 75);
  }

  if (includesAny(allTexts, ["nase", "mund", "rachen", "ohr"])) {
    addSpecialty(specialties, "otolaryngology", "Beschwerden an Nase, Ohr, Mund oder Rachen passen zur HNO-Abklärung.", 65);
  }

  if (includesAny(allTexts, ["bauch", "oberbauch", "unterbauch", "krämpfe", "koliken", "magen", "darm"])) {
    addSpecialty(specialties, "gastroenterology", "Bauchbeschwerden, Krämpfe oder Koliken können gastroenterologisch relevant sein.", 65);
  }

  if (includesAny(allTexts, ["urin", "hoden", "glied", "vorhaut", "flanke"])) {
    addSpecialty(specialties, "urology", "Beschwerden beim Wasserlassen, an Hoden/Glied oder Flankenschmerzen passen zur Urologie.", 70);
  }

  if (
    patientData?.gender.toLowerCase().startsWith("weib") ||
    patientData?.isPregnant ||
    patientData?.isBreastfeeding
  ) {
    if (includesAny(allTexts, ["intimbereich", "zyklus", "vaginal", "ausfluss", "brustwarzen", "unterleib"])) {
      addSpecialty(specialties, "gynecology", "Gynäkologische oder schwangerschafts-/stillzeitbezogene Beschwerden wurden angegeben.", 80);
    }
  }

  if (hasPsychRequest(allTexts)) {
    addSpecialty(specialties, "psychiatry", "Psychische Beschwerden oder Substanzverlangen können psychiatrisch/psychotherapeutisch relevant sein.", 75);
  }

  if (specialties.size === 0) {
    addSpecialty(specialties, "general_practice", "Keine eindeutige Fachrichtung erkennbar. Der Hausarzt ist als erste Anlaufstelle sinnvoll.", 30);
  }

  const recommendedSpecialties = Array.from(specialties.values()).sort((a, b) => b.priority - a.priority);
  const topSpecialty = recommendedSpecialties[0];

  const careLevel =
    topSpecialty.specialty === "emergency_medicine"
      ? "emergency"
      : topSpecialty.specialty === "general_practice"
        ? maxValue >= 5
          ? "doctor"
          : "selfcare"
        : "specialist";
  const recommendedSpecialty = careLevel === "specialist" ? topSpecialty.specialty : undefined;
  const specialtyConfig =
    careLevel === "specialist" && recommendedSpecialty ? createSpecialtyConfig(recommendedSpecialty) : null;

  return {
    careLevel,
    recommendedSpecialty,
    title: specialtyConfig?.title ?? topSpecialty.label,
    titleSupplement: specialtyConfig?.titleSupplement,
    color: specialtyConfig?.color ?? (careLevel === "emergency" ? "#FF2546" : careLevel === "doctor" ? "#F59E0B" : "#10B981"),
    bgColor: specialtyConfig?.bgColor ?? (careLevel === "emergency" ? "#ffcdcd" : careLevel === "doctor" ? "#FEF3C7" : "#D1FAE5"),
    description:
      specialtyConfig?.description ?? "Diese Empfehlung ist eine vorläufige Einschätzung und ersetzt keine medizinische Diagnose.",
    reasons: recommendedSpecialties.map((specialty) => specialty.reason),
    recommendedSpecialties,
  };
}
