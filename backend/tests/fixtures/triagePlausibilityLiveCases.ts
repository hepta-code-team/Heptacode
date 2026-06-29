import type {
  CareLevel,
  PatientData,
  TriageSymptom,
} from '../../src/modules/triage/triage.types.js'

/** Evaluation groups used for category-specific live accuracy rates. */
export const TRIAGE_PLAUSIBILITY_CATEGORIES = [
  'emergency',
  'specialist',
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
  substanceInfluence: '',
  recentAbroad: '',
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: '',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

/** Pregnancy context for pregnancy-specific emergency red flags. */
const pregnantPatientData: PatientData = {
  ...adultPatientData,
  gender: 'Weiblich',
  isPregnant: true,
}

/** Diabetes context for metabolic emergency red flags. */
const diabeticPatientData: PatientData = {
  ...adultPatientData,
  conditions: ['Diabetes mellitus'],
  conditionDetails: {
    diabetes: {
      condition: 'Diabetes mellitus',
      detail: 'Insulinpflichtiger Diabetes',
      duration: 'Seit mehreren Jahren',
    },
  },
}

/** Immunosuppression context for infection-risk triage cases. */
const immunosuppressedPatientData: PatientData = {
  ...adultPatientData,
  medications: 'Prednisolon 20 mg',
  medicationDuration: 'seit 4 Wochen',
  conditions: ['Autoimmunerkrankung'],
  conditionDetails: {
    autoimmuneDisease: {
      condition: 'Autoimmunerkrankung',
      detail: 'Immunsuppressive Therapie mit Prednisolon',
      duration: 'Seit mehreren Jahren',
    },
  },
}

/** Anticoagulation context for head-injury red flags. */
const anticoagulatedPatientData: PatientData = {
  ...adultPatientData,
  medications: 'Apixaban (Eliquis)',
  medicationDuration: 'dauerhaft',
}

/** Recent travel context for infectious-disease specialist triage cases. */
const recentTropicalTravelPatientData: PatientData = {
  ...adultPatientData,
  recentAbroad: true,
  recentAbroadDetails: 'Rueckkehr vor 10 Tagen aus Ghana nach zweiwoechigem Aufenthalt',
}

/** COPD context for pulmonary specialist triage cases. */
const copdPatientData: PatientData = {
  ...adultPatientData,
  conditions: ['COPD'],
  isSmoker: true,
  smokingSinceYears: '20',
  cigarettesPerDay: '15',
  conditionDetails: {
    copd: {
      condition: 'COPD',
      detail: 'Bekannte chronisch obstruktive Lungenerkrankung',
      duration: 'Seit mehreren Jahren',
    },
  },
}

/** ACE-inhibitor medication context for doctor-level side-effect checks. */
const ramiprilPatientData: PatientData = {
  ...adultPatientData,
  medications: 'Ramipril 5 mg',
  medicationDuration: 'seit 3 Wochen',
}

/**
 * Live cases for measuring prompt and model quality across care levels.
 *
 * Cases use deliberately clear presentations so changes in the score are more
 * likely to reflect prompting or model behavior than ambiguous clinical input.
 */
export const TRIAGE_PLAUSIBILITY_LIVE_CASES: TriagePlausibilityLiveCase[] = [
  // Emergency cases without additional patient-risk context.
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
        details: 'Plötzlicher starker Druck auf der Brust mit Atemnot und kaltem Schweiß',
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
    id: 'emergency-transient-stroke-signs',
    name: 'Vorübergehende Schlaganfallzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Gesicht',
        side: 'halbseitig',
        details: 'Vor 20 Minuten hing ein Mundwinkel herab, der rechte Arm war schwach und die Sprache undeutlich; inzwischen sind die Beschwerden wieder verschwunden',
        measurementType: 'severity',
        measurementValue: 5,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-prolonged-seizure',
    name: 'Anhaltender Krampfanfall',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Generalisierter Krampfanfall, der seit sieben Minuten ununterbrochen anhält',
        measurementType: 'severity',
        measurementValue: 9,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-sepsis-signs',
    name: 'Infektion mit Sepsiszeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Hohes Fieber mit Schüttelfrost, plötzlicher Verwirrtheit, schneller Atmung und starkem Krankheitsgefühl',
        measurementType: 'temperature',
        measurementValue: 40.1,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-pulmonary-embolism-signs',
    name: 'Hinweise auf Lungenembolie',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Brust',
        side: 'atemabhängig',
        details: 'Plötzliche Atemnot mit stechendem atemabhängigem Brustschmerz und einseitig geschwollener Wade nach langer Reise',
        measurementType: 'pain',
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
    id: 'emergency-meningitis-signs',
    name: 'Meningitis-Warnzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Fieber mit starken Kopfschmerzen, Nackensteifigkeit, Lichtempfindlichkeit und wiederholtem Erbrechen',
        measurementType: 'pain',
        measurementValue: 8,
        duration: 'today',
      },
    ],
  },
  // Emergency cases driven by medication, pregnancy, or pre-existing conditions.
  {
    id: 'emergency-head-injury-anticoagulated',
    name: 'Kopfverletzung unter Blutverdünnung',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: anticoagulatedPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Sturz auf den Kopf, kurz bewusstlos, danach Erbrechen und Verwirrtheit',
        measurementType: 'pain',
        measurementValue: 5,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-ectopic-pregnancy-signs',
    name: 'Schwangerschaft mit Eileiterschwangerschaft-Warnzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: pregnantPatientData,
    symptoms: [
      {
        region: 'Unterbauch',
        side: 'einseitig',
        details: 'Schwanger mit einseitigem Unterbauchschmerz, vaginaler Blutung, Schulterschmerz und Schwindel',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-diabetic-ketoacidosis-signs',
    name: 'Diabetes mit Ketoazidose-Warnzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: diabeticPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Diabetes mit starkem Durst, häufigem Wasserlassen, Bauchschmerz, Erbrechen, tiefer Atmung und fruchtigem Atem',
        measurementType: 'severity',
        measurementValue: 8,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-pregnancy-preeclampsia-signs',
    name: 'Schwangerschaft mit Präeklampsie-Warnzeichen',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: pregnantPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Schwanger mit starken Kopfschmerzen, Flimmern vor den Augen, Oberbauchschmerz und plötzlich geschwollenem Gesicht',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'today',
      },
    ],
  },
  {
    id: 'emergency-allergy-new-medication-airway-swelling',
    name: 'Allergie und neues Medikament mit Atemwegsschwellung',
    category: 'emergency',
    expectedCareLevel: 'emergency',
    patientData: {
      ...adultPatientData,
      allergies: 'Penicillin',
      medications: 'Amoxicillin',
      medicationDuration: 'seit gestern',
    },
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Nach neuer Antibiotika-Einnahme Ausschlag, Zunge schwillt an, Gesicht geschwollen und zunehmende Atemnot',
        measurementType: 'severity',
        measurementValue: 8,
        duration: 'today',
      },
    ],
  },
  // Specialist-level cases.
  {
    id: 'specialist-immunosuppression-fever',
    name: 'Immunsuppression mit Fieber',
    category: 'specialist',
    expectedCareLevel: 'specialist',
    patientData: immunosuppressedPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Fieber, Schüttelfrost und deutliches Krankheitsgefühl unter laufender Prednisolon-Therapie',
        measurementType: 'temperature',
        measurementValue: 39.1,
        duration: 'today',
      },
    ],
  },
  {
    id: 'specialist-diabetes-infection-vomiting',
    name: 'Diabetes mit Infekt und Erbrechen',
    category: 'specialist',
    expectedCareLevel: 'specialist',
    patientData: diabeticPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Fieberhafter Infekt mit wiederholtem Erbrechen, starkem Durst und häufigem Wasserlassen; Flüssigkeit bleibt kaum drin',
        measurementType: 'temperature',
        measurementValue: 39.4,
        duration: 'today',
      },
    ],
  },
  {
    id: 'specialist-nonspecific-abdominal-pain',
    name: 'Unspezifische Bauchbeschwerden',
    category: 'specialist',
    expectedCareLevel: 'specialist',
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
    id: 'specialist-travel-fever-after-tropics',
    name: 'Fieber nach Tropenreise',
    category: 'specialist',
    expectedCareLevel: 'specialist',
    patientData: recentTropicalTravelPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        side: 'Fieber',
        details: 'Fieber, Kopf- und Gliederschmerzen nach Rueckkehr aus Ghana, wach und kreislaufstabil, keine Atemnot und keine Verwirrtheit',
        measurementType: 'temperature',
        measurementValue: 38.8,
        duration: 'today',
      },
    ],
  },
  {
    id: 'specialist-copd-worsening-cough-sputum',
    name: 'COPD mit zunehmendem Husten und Auswurf',
    category: 'specialist',
    expectedCareLevel: 'specialist',
    patientData: copdPatientData,
    symptoms: [
      {
        region: 'Atmung',
        details: 'Bekannte COPD mit seit drei Tagen zunehmendem Husten, mehr zaehem Auswurf und Belastungsatemnot, keine Atemnot in Ruhe',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'days',
      },
    ],
  },
  {
    id: 'specialist-male-urinary-tract-symptoms',
    name: 'Mann mit Harnwegsbeschwerden',
    category: 'specialist',
    expectedCareLevel: 'specialist',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Urogenital',
        details: 'Brennen beim Wasserlassen und haeufiger Harndrang seit vier Tagen, kein Fieber und keine Flankenschmerzen',
        measurementType: 'severity',
        measurementValue: 5,
        duration: 'days',
      },
    ],
  },
  // Doctor-level cases.
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
    id: 'doctor-hyperthyroidism-signs',
    name: 'Hinweise auf Schilddruesenueberfunktion',
    category: 'doctor',
    expectedCareLevel: 'doctor',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Seit mehreren Wochen Herzrasen, Gewichtsverlust trotz gutem Appetit, starkes Schwitzen, Zittern und innere Unruhe',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    id: 'doctor-ramipril-dry-cough',
    name: 'Trockener Reizhusten unter Ramipril',
    category: 'doctor',
    expectedCareLevel: 'doctor',
    patientData: ramiprilPatientData,
    symptoms: [
      {
        region: 'Atmung',
        details: 'Seit Beginn von Ramipril trockener Reizhusten, kein Fieber, kein Auswurf und keine Atemnot',
        measurementType: 'severity',
        measurementValue: 4,
        duration: 'weeks',
      },
    ],
  },
  // Self-care cases.
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
    id: 'selfcare-minor-head-injury-without-risk-factors',
    name: 'Leichte Kopfverletzung ohne Risikofaktoren',
    category: 'selfcare',
    expectedCareLevel: 'selfcare',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Leicht den Kopf gestossen, keine Bewusstlosigkeit, kein Erbrechen und keine Blutverduenner',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ],
  },
  // False-positive guard cases.
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