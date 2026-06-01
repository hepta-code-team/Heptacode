import armPainIcon from "../../assets/symptoms/armpain.png";
import backPainIcon from "../../assets/symptoms/backpain.png";
import burnIcon from "../../assets/symptoms/burn.png";
import chestPainIcon from "../../assets/symptoms/chestpain.png";
import legPainIcon from "../../assets/symptoms/legpain.png";
import mentalDistressIcon from "../../assets/symptoms/mentaldistress.png";
import overallPainIcon from "../../assets/symptoms/overallpain.png";
import stomachPainIcon from "../../assets/symptoms/stomachpain.png";
import type { SymptomMeasurementType } from "../../types/assessment";
import headAcheIcon from "../../assets/symptoms/headache.png";

export interface BodyRegion {
  id: string;
  name: string;
  icon: string;
  options?: string[];
}

export type BodyAreaCategory = "head" | "torso" | "arms" | "legs" | "mental" | "general";

export const BODY_REGIONS: BodyRegion[] = [
  {
    id: "kopf",
    name: "Kopf",
    icon: headAcheIcon,
    options: ["Stirn", "Schläfen", "Hinterkopf", "Gesicht"],
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
    id: "arme",
    name: "Arme",
    icon: armPainIcon,
    options: ["Schulter", "Oberarm", "Ellenbogen", "Unterarm", "Hand/Handgelenk", "Finger"],
  },
  {
    id: "bauch",
    name: "Bauch",
    icon: stomachPainIcon,
    options: ["Oberbauch", "Unterbauch", "Rechts oben", "Rechts unten", "Links oben", "Links unten"],
  },
  {
    id: "beine",
    name: "Beine",
    icon: legPainIcon,
    options: ["Hüfte", "Oberschenkel", "Knie", "Wade", "Fuß/Knöchel", "Zehen"],
  },
  {
    id: "verbrennung",
    name: "Verbrennung",
    icon: burnIcon,
    options: ["Große Fläche", "Kleine Fläche", "Blasenbildung"],
  },
  {
    id: "allgemein",
    name: "Allgemein",
    icon: overallPainIcon,
    options: ["Fieber", "Übelkeit/Schwindel", "Schwäche", "Verwirrtheit"],
  },
  {
    id: "psychisch",
    name: "Psychische Probleme",
    icon: mentalDistressIcon,
    options: ["Angst/Panik", "Suizidgedanken", "Niedergeschlagenheit"],
  },
];

export const EMERGENCY_SYMPTOM_OPTIONS = ["Suizidgedanken"];

export const BODY_AREA_REGION_IDS: Record<BodyAreaCategory, string[]> = {
  head: ["kopf", "verbrennung"],
  torso: ["brust", "bauch", "ruecken", "verbrennung"],
  arms: ["arme", "verbrennung"],
  legs: ["beine", "verbrennung"],
  mental: ["psychisch"],
  general: ["allgemein"],
};

export const BODY_AREA_LABELS: Record<BodyAreaCategory, string> = {
  head: "Kopf",
  torso: "Torso",
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

export function getMeasurementConfig(region: string, option?: string): MeasurementConfig {
  if (option === "Fieber") {
    return MEASUREMENT_CONFIGS.temperature;
  }

  if (region === "Psychische Probleme") {
    return MEASUREMENT_CONFIGS.feeling;
  }

  if (["Übelkeit/Schwindel", "Schwäche", "Verwirrtheit", "Schüttelfrost"].includes(option ?? "")) {
    return MEASUREMENT_CONFIGS.severity;
  }

  return MEASUREMENT_CONFIGS.pain;
}
