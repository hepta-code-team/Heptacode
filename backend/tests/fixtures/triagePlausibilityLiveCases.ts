import type {
  CareLevel,
  PatientData,
  TriageSymptom,
} from '../../src/modules/triage/triage.types.js'

/** Evaluation groups used for category-specific live accuracy rates. */
export const TRIAGE_PLAUSIBILITY_CATEGORIES = [
  'emergency',
  'doctor',
  'selfcare',
  'false_positive',
] as const

/** Supported category names for live plausibility evaluation cases. */
export type TriagePlausibilityCategory =
  (typeof TRIAGE_PLAUSIBILITY_CATEGORIES)[number]

/** One stable medical scenario and its expected live AI classification. */
export type TriagePlausibilityLiveCase = {
  id: string
  name: string
  category: TriagePlausibilityCategory
  expectedCareLevel: CareLevel
  patientData?: PatientData
  symptoms: TriageSymptom[]
}

/** Adult baseline data keeps age-dependent model output stable across live runs. */
const adultPatientData: PatientData = {
  birthMonth: '05',
  birthYear: '1988',
  height: '175',
  weight: '78',
  gender: 'Maennlich',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  medicationDuration: '',
  substanceInfluence: 'Nein',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

/**
 * Live cases for measuring prompt and model quality across care levels.
 *
 * Cases use deliberately clear presentations so changes in the score are more
 * likely to reflect prompting or model behavior than ambiguous clinical input.
 */
export const TRIAGE_PLAUSIBILITY_LIVE_CASES: TriagePlausibilityLiveCase[] = [
  {
    id: 'emergency-chest-dyspnea',
    name: 'Brustschmerz mit Atemnot',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Brust',
        side: 'Brustmitte',
        details: 'Ploetzlicher starker Druck auf der Brust mit Atemnot und kaltem Schweiss',
        measurementType: 'pain',
        measurementValue: 8,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-stroke-signs',
    name: 'Akute Schlaganfallzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Gesicht',
        side: 'halbseitig',
        details: 'Seit wenigen Minuten haengt ein Mundwinkel, ein Arm ist schwach und die Sprache verwaschen',
        measurementType: 'severity',
        measurementValue: 7,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-suicidal-intent',
    name: 'Akute Suizidgefahr',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Psychische Probleme',
        side: 'Suizidgedanken',
        details: 'Konkrete Suizidabsicht mit Plan, aktuell allein und nicht sicher',
        measurementType: 'severity',
        measurementValue: 9,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-anaphylaxis',
    name: 'Allergische Atemwegsschwellung',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Allergische Reaktion, Zunge und Hals schwellen an, Luftnot nimmt zu',
        measurementType: 'severity',
        measurementValue: 7,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-gastrointestinal-bleeding',
    name: 'Hinweise auf gastrointestinale Blutung',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Bauch',
        details: 'Blutiges Erbrechen, schwarzer Stuhl und zunehmender Schwindel seit heute',
        measurementType: 'severity',
        measurementValue: 8,
        duration: 'today',
      },
    ],
  },
  {
    id: 'doctor-febrile-infection',
    name: 'Fieberhafter Infekt ohne Warnzeichen',
    category: 'doctor',
    expectedCareLevel: 'doctor',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Fieber und Gliederschmerzen seit zwei Tagen, wach und ansprechbar, keine Atemnot',
        measurementType: 'temperature',
        measurementValue: 39.2,
        duration: 'days',
      },
    ],
  },
  {
    id: 'doctor-nonspecific-abdominal-pain',
    name: 'Unspezifische Bauchbeschwerden',
    category: 'doctor',
    expectedCareLevel: 'doctor',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Diffuse Bauchbeschwerden mit leichter Uebelkeit seit drei Tagen, keine Blutung und kein Fieber',
        measurementType: 'severity',
        measurementValue: 5,
        duration: 'days',
      },
    ],
  },
  {
    id: 'doctor-persistent-fatigue',
    name: 'Anhaltende unspezifische Beschwerden',
    category: 'doctor',
    expectedCareLevel: 'doctor',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Seit einer Woche ausgepraegte Muedigkeit und reduzierter Appetit ohne konkrete Organbeschwerden oder Warnzeichen',
        measurementType: 'severity',
        measurementValue: 5,
        duration: 'week',
      },
    ],
  },
  {
    id: 'selfcare-mild-headache',
    name: 'Milde kurzzeitige Kopfschmerzen',
    category: 'selfcare',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Leichte Kopfschmerzen nach langem Bildschirmtag, sonst keine Beschwerden',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  {
    id: 'selfcare-muscle-soreness',
    name: 'Leichter Muskelkater',
    category: 'selfcare',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Beine',
        details: 'Leichter Muskelkater nach ungewohntem Sport, normales Gehen moeglich',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  {
    id: 'selfcare-mild-cold',
    name: 'Leichte Erkaeltungsbeschwerden',
    category: 'selfcare',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Ohr Nase Rachen',
        details: 'Leichter Schnupfen und Kratzen im Hals seit heute, kein Fieber und normale Atmung',
        measurementType: 'severity',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  {
    id: 'false-positive-chest-wall-pain',
    name: 'Milder muskulaerer Brustwandschmerz',
    category: 'false_positive',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Brust',
        details: 'Leichter oberflaechlicher Muskelkater nach Liegestuetzen, nur bei Druck auf den Muskel, keine Atemnot',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  {
    id: 'false-positive-stopped-bleeding',
    name: 'Kleine Wunde mit gestoppter Blutung',
    category: 'false_positive',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Finger',
        details: 'Kleiner oberflaechlicher Schnitt, hat kurz geblutet und blutet jetzt nicht mehr',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  {
    id: 'false-positive-local-swelling',
    name: 'Lokale Schwellung ohne Atemwegsbeteiligung',
    category: 'false_positive',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Knie',
        details: 'Leicht lokal geschwollen nach einer Wanderung, keine Instabilitaet und normales Gehen moeglich',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
]
