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

function normalize(value: string) {
  return value.toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function textOf(symptom: Symptom | SelectedSymptom) {
  const sides = "sides" in symptom && symptom.sides?.length ? symptom.sides.join(" ") : symptom.side ?? "";
  return normalize(`${symptom.region} ${sides}`);
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
  return symptomDetails.some((symptom) => textOf(symptom).includes("suizid") && symptom.measurementValue >= 8);
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

  const administrativeRequest = hasAdministrativeRequest(allTexts);

  if (administrativeRequest) {
    const recommendation: RecommendedSpecialty = {
      specialty: "primary_care",
      label: SPECIALTY_LABELS.primary_care,
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
    addSpecialty(specialties, "emergency", "Ein kritisches Warnsymptom wurde angegeben.", 100);
  }

  if (includesAny(allTexts, ["druckgefühl", "enge", "herzrasen", "herzstechen", "brustmitte"])) {
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
    addSpecialty(specialties, "ent", "Beschwerden an Nase, Ohr, Mund oder Rachen passen zur HNO-Abklärung.", 65);
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
    title: careLevel === "specialist" ? `Empfohlene Fachrichtung: ${topSpecialty.label}` : topSpecialty.label,
    color: careLevel === "emergency" ? "#FF2546" : careLevel === "specialist" ? "#486284" : careLevel === "doctor" ? "#F59E0B" : "#10B981",
    bgColor: careLevel === "emergency" ? "#ffcdcd" : careLevel === "specialist" ? "#E8EEF5" : careLevel === "doctor" ? "#FEF3C7" : "#D1FAE5",
    description:
      careLevel === "specialist"
        ? "Diese Empfehlung ist eine frontendseitige Vorab-Einschätzung und wird später durch Backend/KI ersetzt."
        : "Diese Empfehlung ist eine vorläufige Einschätzung und ersetzt keine medizinische Diagnose.",
    reasons: recommendedSpecialties.map((specialty) => specialty.reason),
    recommendedSpecialties,
  };
}
