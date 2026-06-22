/** Frontend-compatible symptom taxonomy using the same display names as symptoms.constants. */
export const SYMPTOM_REGIONS = [
  {
    locationId: 'head',
    name: 'Kopf',
    options: ['Stirn', 'Schläfen', 'Hinterkopf', 'Gesicht'],
  },
  {
    locationId: 'neck',
    name: 'Hals',
    options: ['Hals', 'Rachen', 'Schluckbeschwerden', 'Nacken'],
  },
  {
    locationId: 'chest',
    name: 'Brust',
    options: ['Brustmitte', 'Linksseitig', 'Rechtsseitig', 'Rippen', 'Atemabhängig'],
  },
  {
    locationId: 'back',
    name: 'Rücken',
    options: ['Nacken', 'Oberer Rücken', 'Mittlerer Rücken', 'Unterer Rücken', 'Steißbein'],
  },
  {
    locationId: 'arms',
    name: 'Arme',
    options: ['Schulter', 'Oberarm', 'Ellenbogen', 'Unterarm', 'Hand/Handgelenk', 'Finger'],
  },
  {
    locationId: 'abdomen',
    name: 'Bauch',
    options: ['Oberbauch', 'Unterbauch', 'Rechts oben', 'Rechts unten', 'Links oben', 'Links unten'],
  },
  {
    locationId: 'legs',
    name: 'Beine',
    options: ['Hüfte', 'Oberschenkel', 'Knie', 'Wade', 'Fuß/Knöchel', 'Zehen'],
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
