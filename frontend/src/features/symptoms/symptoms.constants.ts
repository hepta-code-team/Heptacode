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

const MALE_GENITAL_OPTIONS = ["Hoden", "Männliches Genital", "Vorhaut", "Brennen beim Wasserlassen", "Schwellung"];
const FEMALE_GENITAL_OPTIONS = ["Vaginalbereich", "Unterleib", "Ausfluss", "Vaginale Blutung", "Brennen beim Wasserlassen"];
const ALL_GENITAL_OPTIONS = Array.from(new Set([...MALE_GENITAL_OPTIONS, ...FEMALE_GENITAL_OPTIONS]));

export type BodyAreaCategory =
  | "head"
  | "neck"
  | "torso"
  | "hips"
  | "arms"
  | "hands"
  | "legs"
  | "knees"
  | "feet"
  | "mental"
  | "general";

export const BODY_REGIONS: BodyRegion[] = [
  {
    id: "kopf",
    name: "Kopf",
    icon: headAcheIcon,
    options: ["Kopf allgemein", "Stirn", "Schläfen", "Hinterkopf", "Kopfhaut", "Platzwunde"],
  },
  {
    id: "gesicht",
    name: "Gesicht",
    icon: faceIcon,
    options: ["Augen", "Ohren", "Nase", "Mund"],
  },
  {
    id: "hals",
    name: "Hals",
    icon: backPainIcon,
    options: ["Hals allgemein", "Rachen", "Mandeln", "Kehlkopf", "Schluckbeschwerden", "Schwellung"],
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
    options: ["Oberer Rücken", "Mittlerer Rücken", "Unterer Rücken", "Wirbelsäule", "Steißbein"],
  },
  {
    id: "huefte",
    name: "Hüfte",
    icon: hipPainIcon,
    options: ["Hüfte allgemein", "Leiste", "Gesäßschmerzen", "Seitliche Hüfte"],
  },
  {
    id: "genitalbereich",
    name: "Genitalbereich",
    icon: hipPainIcon,
    options: ALL_GENITAL_OPTIONS,
  },
  {
    id: "oberarm",
    name: "Oberarm",
    icon: upperArmIcon,
    options: ["Schulter", "Oberarm", "Ellenbogen", "Bruch", "Verstauchung"],
  },
  {
    id: "unterarm",
    name: "Unterarm",
    icon: lowerArmIcon,
    options: ["Unterarm allgemein", "Unterarm innen", "Unterarm außen", "Bruch", "Verstauchung"],
  },
  {
    id: "hand",
    name: "Hände",
    icon: lowerArmIcon,
    options: ["Hand", "Handgelenk", "Finger"],
  },
  {
    id: "bauch",
    name: "Bauch",
    icon: stomachPainIcon,
    options: [
      "Bauch allgemein",
      "Oberbauch",
      "Unterbauch",
      "Bauchnabelbereich",
      "Linker Bauch",
      "Rechter Bauch",
      "Linke Flanke",
      "Rechte Flanke",
      "Beidseitige Flanken",
      "Blähbauch",
      "Bauchkrämpfe",
    ],
  },
  {
    id: "oberschenkel",
    name: "Oberschenkel",
    icon: upperLegIcon,
    options: ["Oberschenkel allgemein", "Vorderer Oberschenkel", "Hinterer Oberschenkel", "Innenseite", "Außenseite", "Zerrung", "Prellung"],
  },
  {
    id: "knie",
    name: "Knie",
    icon: upperLegIcon,
    options: ["Vorderes Knie", "Hinteres Knie", "Knie innen", "Knie außen", "Schwellung", "Instabilität", "Blockade", "Verdrehung"],
  },
  {
    id: "unterschenkel",
    name: "Unterschenkel",
    icon: lowerLegIcon,
    options: ["Unterschenkel allgemein", "Wade", "Schienbein", "Zerrung", "Prellung", "Schwellung"],
  },
  {
    id: "fuss",
    name: "Füße",
    icon: lowerLegIcon,
    options: ["Fuß allgemein", "Knöchel", "Zehen", "Ferse", "Fußsohle", "Bruch", "Verstauchung"],
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
    id: "haut",
    name: "Haut",
    icon: overallPainIcon,
    options: ["Ausschlag", "Juckreiz", "Rötung", "Schwellung", "Bläschen", "Quaddeln"],
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

export const EMERGENCY_SYMPTOM_OPTIONS = ["Suizidgedanken"];

export const BODY_AREA_REGION_IDS: Record<BodyAreaCategory, string[]> = {
  head: ["kopf", "gesicht", "verbrennung", "schnittwunde"],
  neck: ["hals", "verbrennung", "schnittwunde"],
  torso: ["brust", "bauch", "ruecken", "verbrennung", "schnittwunde"],
  hips: ["huefte", "genitalbereich", "verbrennung", "schnittwunde"],
  arms: ["oberarm", "unterarm", "verbrennung", "schnittwunde"],
  hands: ["hand", "verbrennung", "schnittwunde"],
  legs: ["oberschenkel", "unterschenkel", "verbrennung", "schnittwunde"],
  knees: ["knie", "verbrennung", "schnittwunde"],
  feet: ["fuss", "verbrennung", "schnittwunde"],
  mental: ["angst", "depression", "halluzinationen", "suizidgedanken"],
  general: ["fieber", "schwaeche", "uebelkeit", "verwirrtheit", "haut"],
};

export const BODY_AREA_LABELS: Record<BodyAreaCategory, string> = {
  head: "Kopf",
  neck: "Hals",
  torso: "Torso",
  hips: "Hüfte",
  arms: "Arme",
  hands: "Hände",
  legs: "Beine",
  knees: "Knie",
  feet: "Füße",
  mental: "Psyche",
  general: "Allgemein",
};

function getGenitalOptionsForGender(gender?: string | null) {
  const normalizedGender = gender?.toLowerCase() ?? "";

  if (normalizedGender.startsWith("männ")) {
    return MALE_GENITAL_OPTIONS;
  }

  if (normalizedGender.startsWith("weib")) {
    return FEMALE_GENITAL_OPTIONS;
  }

  return ALL_GENITAL_OPTIONS;
}

export function getBodyRegionsForCategory(category?: string | null, gender?: string | null) {
  if (!category || !(category in BODY_AREA_REGION_IDS)) {
    return BODY_REGIONS;
  }

  const regionIds = BODY_AREA_REGION_IDS[category as BodyAreaCategory];
  return BODY_REGIONS
    .filter((region) => regionIds.includes(region.id))
    .map((region) =>
      region.id === "genitalbereich"
        ? { ...region, options: getGenitalOptionsForGender(gender) }
        : region
    );
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
