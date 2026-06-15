/** Frontend-compatible symptom taxonomy using the same display names as symptoms.constants. */
export const SYMPTOM_REGIONS = [
  {
    name: 'Kopf',
    options: ['Stirn', 'Schläfen', 'Hinterkopf', 'Gesicht'],
  },
  {
    name: 'Hals',
    options: ['Hals', 'Rachen', 'Schluckbeschwerden', 'Nacken'],
  },
  {
    name: 'Brust',
    options: ['Brustmitte', 'Linksseitig', 'Rechtsseitig', 'Rippen', 'Atemabhängig'],
  },
  {
    name: 'Rücken',
    options: ['Nacken', 'Oberer Rücken', 'Mittlerer Rücken', 'Unterer Rücken', 'Steißbein'],
  },
  {
    name: 'Arme',
    options: ['Schulter', 'Oberarm', 'Ellenbogen', 'Unterarm', 'Hand/Handgelenk', 'Finger'],
  },
  {
    name: 'Bauch',
    options: ['Oberbauch', 'Unterbauch', 'Rechts oben', 'Rechts unten', 'Links oben', 'Links unten'],
  },
  {
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
