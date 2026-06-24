/** Frontend-compatible symptom taxonomy using the same display names as symptoms.constants. */
export const SYMPTOM_REGIONS = [
  {
    locationId: 'head',
    name: 'Kopf',
    options: ['Stirn', 'Schläfen', 'Hinterkopf', 'Gesicht'],
    // Extra matching labels for validation; these do not add new UI options.
    aliases: [
      'Auge',
      'Augen',
      'Ohr',
      'Ohren',
      'Nase',
      'Mund',
      'Lippe',
      'Lippen',
      'Zunge',
      'Zahn',
      'Zähne',
      'Kiefer',
      'Wange',
      'Wangen',
      'Schädel',
      'Kopfhaut',
      'Schläfe',
    ],
  },
  {
    locationId: 'neck',
    name: 'Hals',
    options: ['Hals', 'Rachen', 'Schluckbeschwerden', 'Nacken'],
    aliases: ['Kehle', 'Kehlkopf', 'Mandeln', 'Halswirbelsäule', 'HWS'],
  },
  {
    locationId: 'chest',
    name: 'Brust',
    options: ['Brustmitte', 'Linksseitig', 'Rechtsseitig', 'Rippen', 'Atemabhängig'],
    aliases: ['Brustkorb', 'Brustbein', 'Sternum', 'Rippe', 'Herzgegend'],
  },
  {
    locationId: 'back',
    name: 'Rücken',
    options: ['Nacken', 'Oberer Rücken', 'Mittlerer Rücken', 'Unterer Rücken', 'Steißbein'],
    aliases: ['Wirbelsäule', 'Lendenwirbelsäule', 'Brustwirbelsäule', 'LWS', 'BWS'],
  },
  {
    locationId: 'arms',
    name: 'Arme',
    options: ['Schulter', 'Oberarm', 'Ellenbogen', 'Unterarm', 'Hand/Handgelenk', 'Finger'],
    aliases: [
      'Arm',
      'Ellbogen',
      'Hand',
      'Handgelenk',
      'Handfläche',
      'Handrücken',
      'Daumen',
      'Zeigefinger',
      'Mittelfinger',
      'Ringfinger',
      'Kleiner Finger',
    ],
  },
  {
    locationId: 'abdomen',
    name: 'Bauch',
    options: ['Oberbauch', 'Unterbauch', 'Rechts oben', 'Rechts unten', 'Links oben', 'Links unten'],
    aliases: ['Magen', 'Darm', 'Unterleib', 'Bauchdecke', 'Nabel', 'Flanke', 'Flanken'],
  },
  {
    locationId: 'legs',
    name: 'Beine',
    options: ['Hüfte', 'Oberschenkel', 'Knie', 'Wade', 'Fuß/Knöchel', 'Zehen'],
    aliases: [
      'Bein',
      'Unterschenkel',
      'Schienbein',
      'Fuß',
      'Fuss',
      'Knöchel',
      'Knoechel',
      'Ferse',
      'Zehe',
      'Leiste',
      'Gesäß',
      'Gesaess',
      'Po',
    ],
  },
  {
    name: 'Verbrennung',
    options: ['Große Fläche', 'Kleine Fläche', 'Blasenbildung'],
  },
  {
    name: 'Allgemein',
    options: ['Fieber', 'Übelkeit/Schwindel', 'Schwäche', 'Verwirrtheit'],
  },
  {
    name: 'Psychische Probleme',
    options: ['Angst/Panik', 'Suizidgedanken', 'Niedergeschlagenheit'],
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
    .map((region) => {
      const labels = [...region.options, ...('aliases' in region ? region.aliases : [])]
      return `${region.locationId}: ${region.name} (${labels.join(', ')}).`
    })
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
      labels: [region.name, ...region.options, ...('aliases' in region ? region.aliases : [])],
    }));
}
