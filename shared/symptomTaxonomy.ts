/** Frontend-kompatible Symptomtaxonomie (Anzeigenamen wie in symptoms.constants). */
export const SYMPTOM_REGIONS = [
  {
    name: 'Kopf',
    options: ['Kopf allgemein', 'Stirn', 'Schläfen', 'Hinterkopf', 'Kopfhaut', 'Platzwunde'],
  },
  {
    name: 'Gesicht',
    options: ['Augen', 'Ohren', 'Nase', 'Mund'],
  },
  {
    name: 'Hals',
    options: ['Hals allgemein', 'Rachen', 'Mandeln', 'Kehlkopf', 'Schluckbeschwerden', 'Schwellung'],
  },
  {
    name: 'Brust',
    options: ['Brustmitte', 'Linksseitig', 'Rechtsseitig', 'Rippen', 'Atemabhängig'],
  },
  {
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
    name: 'Oberarm',
    options: ['Schulter', 'Oberarm', 'Ellenbogen', 'Bruch', 'Verstauchung'],
  },
  {
    name: 'Unterarm',
    options: ['Unterarm allgemein', 'Unterarm innen', 'Unterarm außen', 'Bruch', 'Verstauchung'],
  },
  {
    name: 'Hände',
    options: ['Hand', 'Handgelenk', 'Finger'],
  },
  {
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
    ],
  },
  {
    name: 'Knie',
    options: ['Vorderes Knie', 'Hinteres Knie', 'Knie innen', 'Knie außen', 'Schwellung', 'Instabilität', 'Blockade', 'Verdrehung'],
  },
  {
    name: 'Unterschenkel',
    options: ['Unterschenkel allgemein', 'Wade', 'Schienbein', 'Zerrung', 'Prellung', 'Schwellung'],
  },
  {
    name: 'Füße',
    options: ['Fuß allgemein', 'Knöchel', 'Zehen', 'Ferse', 'Fußsohle', 'Bruch', 'Verstauchung'],
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
    options: ['Ausschlag', 'Juckreiz', 'Rötung', 'Schwellung', 'Bläschen', 'Quaddeln'],
  },
  {
    name: 'Psychische Probleme',
    options: ['Angst/Panik', 'Suizidgedanken', 'Niedergeschlagenheit', 'Halluzinationen'],
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
