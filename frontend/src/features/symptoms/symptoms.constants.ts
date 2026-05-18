import armPainIcon from "../../assets/symptoms/armpain.png";
import backPainIcon from "../../assets/symptoms/backpain.png";
import chestPainIcon from "../../assets/symptoms/chestpain.png";
import legPainIcon from "../../assets/symptoms/legpain.png";
import mentalDistressIcon from "../../assets/symptoms/mentaldistress.png";
import overallPainIcon from "../../assets/symptoms/overallpain.png";
import stomachPainIcon from "../../assets/symptoms/stomachpain.png";
import headAcheIcon from "../../assets/symptoms/headache.png";
import type { PatientData, SymptomMeasurementType } from "../../types/assessment";

export interface BodyRegion {
  id: string;
  name: string;
  icon: string;
  options?: string[];
  nestedOptions?: Record<string, string[]>;
}

export type BodyAreaCategory = "head" | "torso" | "arms" | "legs" | "mental" | "general";

export const MAX_SYMPTOMS = 3;

export const CRITICAL_SYMPTOM_OPTIONS = [
  "Druckgefühl / Enge",
  "Atemnot",
  "Suizidgedanken",
  "Verwirrtheit / Desorientierung",
  "Einseitig geschwollene oder heiße Wade",
  "Vaginale Blutung",
  "Abgang von Fruchtwasser",
];

export const EMERGENCY_SYMPTOM_OPTIONS = [
  "Suizidgedanken",
  "Druckgefühl / Enge",
  "Atemnot",
];

export function isCriticalSymptom(region: string, option?: string) {
  return Boolean(option && CRITICAL_SYMPTOM_OPTIONS.includes(option));
}

function isFemale(patientData?: PatientData | null) {
  return patientData?.gender?.toLowerCase().startsWith("weib") ?? false;
}

function isMale(patientData?: PatientData | null) {
  return patientData?.gender?.toLowerCase().startsWith("männ") ?? false;
}

function getIntimateOptions(patientData?: PatientData | null) {
  return [
    "Leistenbruch / Wölbung in der Leiste",
    "Brennen beim Urinieren",
    "Leistenzerrung / Sportverletzung",
    ...(isFemale(patientData)
      ? [
          "Regelschmerzen / Zyklusbeschwerden",
          "Starke Unterleibskrämpfe",
          "Zwischenblutungen",
          "Brennen oder Jucken im Intimbereich",
          "Druckgefühl im Becken",
        ]
      : []),
    ...(isMale(patientData)
      ? [
          "Hoden- oder Leistenschmerzen",
          "Schwellung / Knubbel im Hoden",
          "Probleme beim Wasserlassen",
          "Schmerzen am Glied / Vorhaut",
        ]
      : []),
    ...(patientData?.isPregnant
      ? ["Veränderter Ausfluss", "Juckreiz im Intimbereich"]
      : []),
  ];
}

export function getBodyRegions(patientData?: PatientData | null): BodyRegion[] {
  return [
    {
      id: "kopf",
      name: "Kopf",
      icon: headAcheIcon,
      options: [
        "Kopf allgemein",
        "Stirn",
        "Schläfen",
        "Hinterkopf",
        "Gesicht",
        "Licht- / Lärmempfindlichkeit",
        "Verletzungen",
        ...(patientData?.isPregnant ? ["Flimmern vor den Augen / Sehstörungen"] : []),
      ],
      nestedOptions: {
        Gesicht: ["Auge", "Ohr", "Kiefer", "Nase", "Mund / Rachen"],
      },
    },
    {
      id: "brust",
      name: "Brust",
      icon: chestPainIcon,
      options: [
        "Brustmitte",
        "Linksseitig",
        "Rechtsseitig",
        "Rippen",
        "Schmerz beim Einatmen",
        "Herzstechen / Herzrasen",
        "Druckgefühl / Enge",
        ...(patientData?.isBreastfeeding
          ? [
              "Schmerzhafte Verhärtung / Knoten in der Brust",
              "Rötung und Hitzegefühl der Brust",
              "Wunde oder blutende Brustwarzen",
            ]
          : []),
      ],
    },
    {
      id: "ruecken",
      name: "Rücken",
      icon: backPainIcon,
      options: [
        "Nacken / Steifer Hals",
        "Oberer Rücken",
        "Mittlerer Rücken",
        "Lendenbereich / Kreuz",
        "Steißbein",
        "Hexenschuss / Einschießender Schmerz",
      ],
    },
    {
      id: "arme",
      name: "Arme",
      icon: armPainIcon,
      options: ["Schulter", "Oberarm", "Ellenbogen", "Unterarm", "Hand/Handgelenk", "Finger"],
    },
    {
      id: "bauch",
      name: "Bauch & Flanke",
      icon: stomachPainIcon,
      options: [
        "Oberbauch (Magengegend)",
        "Unterbauch (Darm/Regelschmerzen)",
        "Ganzes Fettgewebe / Blähbauch",
        "Flanke",
        "Krämpfe / Koliken",
        ...(patientData?.isPregnant
          ? [
              "Regelmäßige Kontraktionen / Hartwerden des Bauches",
              "Ungewöhnlicher Druck nach unten",
              "Abgang von Fruchtwasser",
              "Vaginale Blutung",
            ]
          : []),
      ],
    },
    {
      id: "leiste-intim",
      name: "Leiste / Intimbereich",
      icon: stomachPainIcon,
      options: getIntimateOptions(patientData),
    },
    {
      id: "beine",
      name: "Beine",
      icon: legPainIcon,
      options: [
        "Hüfte",
        "Oberschenkel",
        "Knie",
        "Wade",
        "Fuß/Knöchel",
        "Zehen",
        "Gefühl & Schwellung",
        ...(patientData?.isPregnant
          ? [
              "Starke Wassereinlagerungen (Ödeme)",
              "Einseitig geschwollene oder heiße Wade",
            ]
          : []),
      ],
      nestedOptions: {
        "Gefühl & Schwellung": [
          "Kribbeln oder Taubheit",
          "Bein ist geschwollen / heiß",
          "Bein fühlt sich kalt an",
          "Kraftlosigkeit / Wegknicken",
        ],
      },
    },
    {
      id: "verbrennung",
      name: "Verbrennung",
      icon: overallPainIcon,
      options: ["Größer als eine Handfläche", "Punktuelle Verbrennung", "Sonnenbrand"],
    },
    {
      id: "allgemein",
      name: "Allgemein",
      icon: overallPainIcon,
      options: [
        "Fieber",
        "Atemnot",
        "Übelkeit/Schwindel",
        "Schwäche",
        "Appetitlosigkeit / Gewichtsverlust",
        "Schlafstörung",
        "Schüttelfrost",
      ],
    },
    {
      id: "psychisch",
      name: "Psychische Probleme",
      icon: mentalDistressIcon,
      options: [
        "Angst/Panik",
        "Suizidgedanken",
        "Niedergeschlagenheit",
        "Sucht / Substanzverlangen",
        "Verwirrtheit / Desorientierung",
      ],
    },
  ];
}

export const BODY_REGIONS = getBodyRegions();

export const BODY_AREA_REGION_IDS: Record<BodyAreaCategory, string[]> = {
  head: ["kopf", "verbrennung"],
  torso: ["brust", "bauch", "ruecken", "leiste-intim", "verbrennung"],
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

export function getBodyRegionsForCategory(category?: string | null, patientData?: PatientData | null) {
  const regions = getBodyRegions(patientData);

  if (!category || !(category in BODY_AREA_REGION_IDS)) {
    return regions;
  }

  const regionIds = BODY_AREA_REGION_IDS[category as BodyAreaCategory];
  return regions.filter((region) => regionIds.includes(region.id));
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
  "Sonstige",
];

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
  infoTitle?: string;
  infoText: string;
}

const MEASUREMENT_CONFIGS: Record<string, MeasurementConfig> = {
  pain: {
    type: "pain",
    title: "Schmerzstärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
    infoTitle: "Schmerzskala",
    infoText: "Diese Skala beschreibt, wie stark der Schmerz aktuell ist. 1 bedeutet leichte Schmerzen, 10 bedeutet kaum auszuhaltende Schmerzen.",
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
    infoTitle: "Temperaturskala",
    infoText: "Wählen Sie die gemessene oder geschätzte Körpertemperatur. Sehr hohes Fieber kann ein Warnzeichen sein.",
  },
  breathing: {
    type: "severity",
    title: "Atemnot",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Nur leicht",
    maxLabel: "In Ruhe / kaum sprechen",
    infoTitle: "Atemnot-Skala",
    infoText: "Diese Skala beschreibt, wie stark die Luftnot ist. Hohe Werte bedeuten Atemnot in Ruhe, beim Sprechen oder ein starkes Engegefühl.",
  },
  pressure: {
    type: "severity",
    title: "Druck / Engegefühl",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark / beängstigend",
    infoTitle: "Druck- und Engegefühl",
    infoText: "Diese Skala beschreibt, wie stark Druck, Enge oder Beklemmung empfunden werden, zum Beispiel im Brustbereich.",
  },
  feeling: {
    type: "feeling",
    title: "Belastungsstärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht belastend",
    maxLabel: "Sehr belastend",
    infoTitle: "Psychische Belastung",
    infoText: "Diese Skala beschreibt, wie stark Sie sich durch das Gefühl oder die psychische Beschwerde aktuell belastet fühlen.",
  },
  severity: {
    type: "severity",
    title: "Beschwerdestärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
    infoTitle: "Beschwerdestärke",
    infoText: "Diese Skala beschreibt, wie stark die Beschwerde aktuell ausgeprägt ist und wie sehr sie Sie einschränkt.",
  },
  sleep: {
    type: "severity",
    title: "Schlafbeeinträchtigung",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Kaum gestört",
    maxLabel: "Gar kein Schlaf möglich",
    infoTitle: "Schlafstörung",
    infoText: "Diese Skala beschreibt, wie stark Ihr Schlaf aktuell beeinträchtigt ist.",
  },
  swelling: {
    type: "severity",
    title: "Ausprägung",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
    infoTitle: "Gefühl, Schwellung oder Kraftverlust",
    infoText: "Diese Skala beschreibt, wie stark Schwellung, Taubheit, Kribbeln, Hitze, Kälte oder Kraftverlust ausgeprägt sind.",
  },
  burn: {
    type: "pain",
    title: "Verbrennungsstärke",
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Leicht",
    maxLabel: "Sehr stark",
    infoTitle: "Verbrennung",
    infoText: "Diese Skala beschreibt die Stärke der Beschwerden durch Verbrennung, Sonnenbrand oder Hitzeeinwirkung.",
  },
};

function optionIncludes(option: string | undefined, words: string[]) {
  const normalizedOption = (option ?? "").toLowerCase();
  return words.some((word) => normalizedOption.includes(word.toLowerCase()));
}

export function getMeasurementConfig(region: string, option?: string): MeasurementConfig {
  if (optionIncludes(option, ["Fieber"])) {
    return MEASUREMENT_CONFIGS.temperature;
  }

  if (optionIncludes(option, ["Atemnot"])) {
    return MEASUREMENT_CONFIGS.breathing;
  }

  if (optionIncludes(option, ["Druckgefühl", "Enge", "Herzstechen", "Herzrasen"])) {
    return MEASUREMENT_CONFIGS.pressure;
  }

  if (
    region === "Psychische Probleme" ||
    optionIncludes(option, ["Angst", "Panik", "Sucht", "Substanzverlangen", "Niedergeschlagenheit"])
  ) {
    return MEASUREMENT_CONFIGS.feeling;
  }

  if (optionIncludes(option, ["Schlafstörung"])) {
    return MEASUREMENT_CONFIGS.sleep;
  }

  if (
    optionIncludes(option, [
      "geschwollen",
      "Schwellung",
      "Wassereinlagerungen",
      "Ödeme",
      "heiß",
      "kalt",
      "Taubheit",
      "Kribbeln",
      "Kraftlosigkeit",
      "Wegknicken",
    ])
  ) {
    return MEASUREMENT_CONFIGS.swelling;
  }

  if (
    region === "Verbrennung" ||
    optionIncludes(option, ["Verbrennung", "Sonnenbrand", "Größer als eine Handfläche", "Punktuelle Verbrennung"])
  ) {
    return MEASUREMENT_CONFIGS.burn;
  }

  if (
    optionIncludes(option, [
      "Übelkeit",
      "Schwindel",
      "Schwäche",
      "Schüttelfrost",
      "Appetitlosigkeit",
      "Gewichtsverlust",
      "Verwirrtheit",
      "Desorientierung",
      "Blutung",
      "Fruchtwasser",
      "Ausfluss",
      "Juckreiz",
      "Brennen",
      "Krämpfe",
      "Koliken",
    ])
  ) {
    return MEASUREMENT_CONFIGS.severity;
  }

  return MEASUREMENT_CONFIGS.pain;
}
