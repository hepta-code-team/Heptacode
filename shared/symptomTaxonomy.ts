/** Frontend-compatible symptom taxonomy using the same display names as symptoms.constants. */
export const SYMPTOM_REGIONS = [
  {
    locationId: 'head',
    name: 'Kopf',
    options: ['Kopf allgemein', 'Stirn', 'Schläfen', 'Hinterkopf', 'Kopfhaut', 'Platzwunde'],
  },
  {
    name: 'Gesicht',
    options: [
      'Augen',
      'Augenschmerzen',
      'Rötung am Auge',
      'Juckreiz am Auge',
      'Sehstörung',
      'Fremdkörpergefühl im Auge',
      'Schwellung am Auge',
      'Ohren',
      'Ohrenschmerzen',
      'Hörminderung',
      'Ohrdruck',
      'Ohrgeräusche',
      'Ausfluss aus dem Ohr',
      'Schwindel',
      'Nase',
      'Nasenschmerzen',
      'Verstopfte Nase',
      'Laufende Nase',
      'Nasenbluten',
      'Nebenhöhlendruck',
      'Mund',
      'Mundschmerzen',
      'Aphten',
      'Zungenschmerzen',
      'Brennen im Mund',
      'Schwellung im Mund',
      'Schluckbeschwerden',
      'Zähne',
      'Zahnschmerzen',
      'Zahnfleischbluten',
      'Zahnfleischschwellung',
      'Kieferschmerzen',
      'Kälte-/Wärmeempfindlichkeit',
      'Lockerer Zahn',
    ],
  },
  {
    locationId: 'neck',
    name: 'Hals',
    options: ['Hals allgemein', 'Rachen', 'Mandeln', 'Kehlkopf', 'Schluckbeschwerden', 'Schwellung', 'Nacken'],
  },
  {
    locationId: 'chest',
    name: 'Brust',
    options: ['Brustmitte', 'Linksseitig', 'Rechtsseitig', 'Rippen', 'Atemabhängig'],
  },
  {
    locationId: 'back',
    name: 'Rücken',
    options: ['Oberer Rücken', 'Mittlerer Rücken', 'Unterer Rücken', 'Wirbelsäule', 'Steißbein'],
  },
  {
    name: 'Hüfte',
    options: ['Hüfte allgemein', 'Leiste', 'Gesäßschmerzen', 'Seitliche Hüfte'],
  },
  {
    name: 'Genitalbereich',
    options: [
      'Hoden',
      'Männliches Genital',
      'Vorhaut',
      'Brennen beim Wasserlassen',
      'Schwellung',
      'Vaginalbereich',
      'Unterleib',
      'Ausfluss',
      'Vaginale Blutung',
    ],
  },
  {
    locationId: 'arms',
    name: 'Arme',
    options: [
      'Schulter',
      'Oberarm',
      'Ellenbogen',
      'Unterarm',
      'Hand/Handgelenk',
      'Finger',
      'Bruch',
      'Verstauchung',
      'Muskelkrämpfe',
    ],
  },
  {
    name: 'Oberarm',
    options: ['Schulter', 'Oberarm', 'Ellenbogen', 'Bruch', 'Verstauchung', 'Muskelkrämpfe'],
  },
  {
    name: 'Unterarm',
    options: ['Unterarm allgemein', 'Unterarm innen', 'Unterarm außen', 'Bruch', 'Verstauchung', 'Muskelkrämpfe'],
  },
  {
    name: 'Hände',
    options: ['Hand', 'Handgelenk', 'Finger'],
  },
  {
    locationId: 'abdomen',
    name: 'Bauch',
    options: [
      'Bauch allgemein',
      'Oberbauch',
      'Unterbauch',
      'Bauchnabelbereich',
      'Linker Bauch',
      'Rechter Bauch',
      'Linke Flanke',
      'Rechte Flanke',
      'Beidseitige Flanken',
      'Blähbauch',
      'Bauchkrämpfe',
      'Magenkrämpfe',
    ],
  },
  {
    locationId: 'legs',
    name: 'Beine',
    options: [
      'Hüfte',
      'Oberschenkel',
      'Knie',
      'Wade',
      'Fuß/Knöchel',
      'Zehen',
      'Füße',
      'Fußschmerzen',
      'Knöchelschmerzen',
      'Fersenschmerzen',
      'Fußsohlenschmerzen',
      'Zehenschmerzen',
      'Bruchverdacht',
      'Bruch',
      'Verstauchung',
      'Muskelkrämpfe',
    ],
  },
  {
    name: 'Oberschenkel',
    options: [
      'Oberschenkel allgemein',
      'Vorderer Oberschenkel',
      'Hinterer Oberschenkel',
      'Innenseite',
      'Außenseite',
      'Zerrung',
      'Prellung',
      'Muskelkrämpfe',
    ],
  },
  {
    name: 'Knie',
    options: [
      'Knieschmerzen',
      'Vorderes Knie',
      'Hinteres Knie',
      'Knie innen',
      'Knie außen',
      'Schwellung',
      'Instabilität',
      'Blockade',
      'Verdrehung',
      'Eingeschränkte Beweglichkeit',
      'Knacken/Reiben',
    ],
  },
  {
    name: 'Unterschenkel',
    options: ['Unterschenkel allgemein', 'Wade', 'Schienbein', 'Zerrung', 'Prellung', 'Schwellung', 'Muskelkrämpfe'],
  },
  {
    name: 'Füße',
    options: [
      'Fuß allgemein',
      'Fußschmerzen',
      'Knöchel',
      'Knöchelschmerzen',
      'Zehen',
      'Zehenschmerzen',
      'Ferse',
      'Fersenschmerzen',
      'Fußsohle',
      'Fußsohlenschmerzen',
      'Bruch',
      'Bruchverdacht',
      'Verstauchung',
    ],
  },
  {
    name: 'Verbrennung',
    options: ['Große Fläche', 'Kleine Fläche', 'Blasenbildung'],
  },
  {
    name: 'Schnittwunde',
    options: ['Leichte Blutung', 'Starke Blutung', 'Klaffende Wundränder'],
  },
  {
    name: 'Allgemein',
    options: ['Fieber', 'Übelkeit/Schwindel', 'Schwäche', 'Verwirrtheit'],
  },
  {
    name: 'Haut',
    options: ['Hautausschlag', 'Ausschlag', 'Juckreiz', 'Rötung', 'Schwellung', 'Bläschen', 'Quaddeln', 'Trockene Haut'],
  },
  {
    name: 'Psychische Probleme',
    options: ['Angst/Panik', 'Suizidgedanken', 'Niedergeschlagenheit', 'Halluzinationen'],
  },
] as const;

// Stable broad location IDs used to compare regions across UI text and AI output.
export const BODY_LOCATION_IDS = [
  'head',
  'neck',
  'chest',
  'back',
  'arms',
  'abdomen',
  'legs',
] as const;

export type BodyLocationId = (typeof BODY_LOCATION_IDS)[number];

export const BODY_LOCATION_CONFIDENCE_LEVELS = ['none', 'low', 'medium', 'high'] as const;
export type BodyLocationConfidence = (typeof BODY_LOCATION_CONFIDENCE_LEVELS)[number];

export type SymptomRegionName = (typeof SYMPTOM_REGIONS)[number]['name'];

export const SYMPTOM_REGION_NAMES = SYMPTOM_REGIONS.map((region) => region.name) as [
  SymptomRegionName,
  ...SymptomRegionName[],
];

const OPTIONS_BY_REGION = new Map(
  SYMPTOM_REGIONS.map((region) => [region.name, [...region.options]] as const),
);

export function getOptionsForRegion(region: SymptomRegionName): readonly string[] {
  return OPTIONS_BY_REGION.get(region) ?? [];
}

export function formatSymptomTaxonomyForPrompt(): string {
  return SYMPTOM_REGIONS.map((region) => {
    const options = region.options.join(', ');
    return `${region.name}: ${options}.`;
  }).join('\n');
}

export function formatBodyLocationTaxonomyForPrompt(): string {
  return SYMPTOM_REGIONS
    .filter((region): region is typeof region & { locationId: BodyLocationId } => 'locationId' in region)
    .map((region) => `${region.locationId}: ${region.name} (${region.options.join(', ')}).`)
    .join('\n');
}

// Exposes labels and options from the central taxonomy for deterministic matching.
export function getBodyLocationTaxonomy(): Array<{
  id: BodyLocationId;
  labels: string[];
}> {
  return SYMPTOM_REGIONS
    .filter((region): region is typeof region & { locationId: BodyLocationId } => 'locationId' in region)
    .map((region) => ({
      id: region.locationId,
      labels: [region.name, ...region.options],
    }));
}
