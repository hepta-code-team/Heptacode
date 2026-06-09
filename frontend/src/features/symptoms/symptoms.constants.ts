import backPainIcon from "../../assets/symptoms/backpain.png";
import burnIcon from "../../assets/symptoms/burn.png";
import chestPainIcon from "../../assets/symptoms/chestpain.png";
import mentalDistressIcon from "../../assets/symptoms/mentaldistress.png";
import overallPainIcon from "../../assets/symptoms/overallpain.png";
import stomachPainIcon from "../../assets/symptoms/stomachpain.png";
import type { SymptomMeasurementType } from "../../types/assessment";
import headAcheIcon from "../../assets/symptoms/headache.png";
import faceIcon from "../../assets/symptoms/face.png";
import bleedingIcon from "../../assets/symptoms/bleeding.png";
import lowerArmIcon from "../../assets/symptoms/lowerArm.png";
import upperArmIcon from "../../assets/symptoms/upperArm.png";
import upperLegIcon from "../../assets/symptoms/upperLeg.png";
import lowerLegIcon from "../../assets/symptoms/lowerLeg.png";
import hipPainIcon from "../../assets/symptoms/hip.png"
import nauseaIcon from "../../assets/symptoms/nausea.png";
import feverIcon from "../../assets/symptoms/fever.png";
import weaknessIcon from "../../assets/symptoms/weakness.png";
import confusionIcon from "../../assets/symptoms/confusion.png";

export interface BodyRegion {
  id: string;
  name: string;
  icon: string;
  options?: string[];
}

export type BodyAreaCategory = "head" | "torso" | "arms" | "legs" | "mental" | "general";

/**
 * Canonical symptom regions shown in the manual selection flow.
 * These names are also used by AI extraction and triage normalization, so
 * display labels should only change together with the shared taxonomy.
 */
export const BODY_REGIONS: BodyRegion[] = [
  {
    id: "kopf",
    name: "Kopf",
    icon: headAcheIcon,
    options: ["Stirn", "Schläfen", "Hinterkopf", "Gesicht"],
  },
  {
    id: "gesicht",
    name: "Gesicht",
    icon: faceIcon,
    options: ["Augen", "Ohren", "Nase", "Mund"],
  },
  {
    id: "brust",
    name: "Brust",
    icon: chestPainIcon,
    options: ["Brustmitte", "Linksseitig", "Rechtsseitig", "Rippen", "Atemabhängig"],
  },
  {
    id: "ruecken",
    name: "Rücken",
    icon: backPainIcon,
    options: ["Nacken", "Oberer Rücken", "Mittlerer Rücken", "Unterer Rücken", "Steißbein"],
  },
  {
    id: "huefte",
    name: "Hüfte",
    icon: hipPainIcon,
    options: ["Leiste", "Gesäßschmerzen", "Hüfte", "Seitliche Hüfte"],
  },
  {
    id: "oberarm",
    name: "Oberarm",
    icon: upperArmIcon,
    options: ["Schulter", "Oberarm", "Ellenbogen"],
  },
  {
    id: "unterarm",
    name: "Unterarm",
    icon: lowerArmIcon,
    options: ["Unterarm", "Hand/Handgelenk", "Finger"],
  },
  {
    id: "bauch",
    name: "Bauch",
    icon: stomachPainIcon,
    options: ["Oberbauch", "Unterbauch", "Rechts oben", "Rechts unten", "Links oben", "Links unten"],
  },
  {
    id: "oberschenkel",
    name: "Oberschenkel",
    icon: upperLegIcon,
    options: ["Hüfte", "Oberschenkel", "Knie"],
  },
  {
    id: "unterschenkel",
    name: "Unterschenkel",
    icon: lowerLegIcon,
    options: ["Wade", "Fuß/Knöchel", "Zehen"],
  },
  {
    id: "verbrennung",
    name: "Verbrennung",
    icon: burnIcon,
    options: ["Große Fläche", "Kleine Fläche", "Blasenbildung"],
  },
  {
    id: "schnittwunde",
    name: "Schnittwunde",
    icon: bleedingIcon,
    options: ["Leichte Blutung", "Starke Blutung", "Klaffende Wundränder"],
  },
  {
    id: "allgemein",
    name: "Allgemein",
    icon: overallPainIcon,
    options: ["Fieber", "Übelkeit/Schwindel", "Schwäche", "Verwirrtheit"],
  },
  {
    id: "fieber",
    name: "Fieber",
    icon: feverIcon,
  },
  {
    id: "uebelkeit",
    name: "Übelkeit/Schwindel",
    icon: nauseaIcon,
  },
  {
    id: "schwaeche",
    name: "Schwäche",
    icon: weaknessIcon,
  },
  {
    id: "verwirrtheit",
    name: "Verwirrtheit",
    icon: confusionIcon,
  },
  {
    id: "angst",
    name: "Angst/Panik",
    icon: mentalDistressIcon,
  },
  {
    id: "depression",
    name: "Niedergeschlagenheit",
    icon: mentalDistressIcon,
  },
  {
    id: "suizidgedanken",
    name: "Suizidgedanken",
    icon: mentalDistressIcon,
  },
  {
    id: "halluzinationen",
    name: "Halluzinationen",
    icon: mentalDistressIcon,
  },
];

/**
 * Manual suboptions that immediately trigger the emergency path.
 * The list is intentionally small because these options bypass the normal
 * symptom-details step and should only include high-confidence red flags.
 */
export const EMERGENCY_SYMPTOM_OPTIONS = ["Suizidgedanken"];

/**
 * Maps coarse body areas to the detailed regions shown after selection.
 * Shared injury types such as burns and cuts appear in multiple body areas
 * because their location is less important than surfacing the symptom quickly.
 */
export const BODY_AREA_REGION_IDS: Record<BodyAreaCategory, string[]> = {
  head: ["kopf", "gesicht", "verbrennung", "schnittwunde"],
  torso: ["brust", "bauch", "ruecken", "huefte", "verbrennung", "schnittwunde"],
  arms: ["oberarm", "unterarm", "verbrennung", "schnittwunde"],
  legs: ["oberschenkel", "unterschenkel", "verbrennung", "schnittwunde"],
  mental: ["angst", "depression","halluzinationen", "suizidgedanken"],
  general: ["fieber", "schwaeche", "uebelkeit", "verwirrtheit"],
};

export const BODY_AREA_LABELS: Record<BodyAreaCategory, string> = {
  head: "Kopf",
  torso: "Torso und Hüfte",
  arms: "Arme",
  legs: "Beine",
  mental: "Psyche",
  general: "Allgemein",
};

export function getBodyRegionsForCategory(category?: string | null) {
  if (!category || !(category in BODY_AREA_REGION_IDS)) {
    return BODY_REGIONS;
  }

  const regionIds = BODY_AREA_REGION_IDS[category as BodyAreaCategory];
  return BODY_REGIONS.filter((region) => regionIds.includes(region.id));
}

export interface Duration {
  id: string;
  label: string;
}

export const DURATIONS: Duration[] = [
  { id: "today", label: "Seit heute" },
  { id: "days", label: "Seit ein paar Tagen" },
  { id: "week", label: "Seit einer Woche" },
  { id: "weeks", label: "Seit mehr als 2 Wochen" },
];

export const PRE_EXISTING_CONDITIONS = [
  "Diabetes",
  "Bluthochdruck",
  "Herzerkrankungen",
  "Asthma/COPD",
  "Nierenerkrankungen",
  "Lebererkrankungen",
  "Epilepsie",
  "Psychische Erkrankung",
  "Sonstige",
];

export const MAX_SYMPTOMS = 3;

export interface MeasurementConfig {
  type: SymptomMeasurementType;
  title: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  minLabel: string;
  maxLabel: string;
}

const MEASUREMENT_CONFIGS: Record<SymptomMeasurementType, MeasurementConfig> = {
  pain: {
    type: "pain",
    title: "Schmerzstärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
  },
  temperature: {
    type: "temperature",
    title: "Temperatur",
    min: 38,
    max: 42.5,
    step: 0.1,
    defaultValue: 38,
    unit: "°C",
    minLabel: "38 °C",
    maxLabel: ">42 °C",
  },
  feeling: {
    type: "feeling",
    title: "Gefühlsintensität",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
  },
  severity: {
    type: "severity",
    title: "Beschwerdestärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
  },
};

/**
 * Chooses the measurement UI based on the selected symptom region.
 * Most symptoms use pain by default, while fever, mental-health symptoms, and
 * general complaints need scales that better match their clinical meaning.
 */
export function getMeasurementConfig(region: string): MeasurementConfig {
    if (region === "Fieber") {
        return MEASUREMENT_CONFIGS.temperature;
    }

    if ((region === "Angst/Panik") || (region === "Niedergeschlagenheit") || (region === "Suizidgedanken")
        || (region === "Halluzinationen")) {
        return MEASUREMENT_CONFIGS.feeling;
    }

    if ((region === "Verwirrtheit") || (region === "Schwäche") || (region === "Übelkeit/Schwindel")) {
        return MEASUREMENT_CONFIGS.severity;
    }

    return MEASUREMENT_CONFIGS.pain;
}

export function getMeasurementConfigByType(type: SymptomMeasurementType): MeasurementConfig {
    return MEASUREMENT_CONFIGS[type];
}
