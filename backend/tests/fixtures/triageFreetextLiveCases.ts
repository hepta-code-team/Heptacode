import type {
  CareLevel,
  PatientData,
} from '../../src/modules/triage/triage.types.js'

/** One free-text emergency scenario and its expected triage result. */
export type TriageFreetextLiveCase = {
  id: string
  name: string
  expectedCareLevel: CareLevel
  patientData: PatientData
  text: string
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
  recentAbroad: '',
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: '',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

/** Free-text cases for TE2.1: explicit emergency symptoms must remain emergency. */
export const TRIAGE_FREETEXT_LIVE_CASES: TriageFreetextLiveCase[] = [
  {
    id: 'freetext-emergency-chest-pain',
    name: 'Freitext Brustschmerz mit Atemnot',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich habe seit wenigen Minuten starken Druck auf der Brust, bekomme schlecht Luft und mir ist kalt-schweissig.',
  },
  {
    id: 'freetext-emergency-stroke-signs',
    name: 'Freitext Schlaganfallzeichen',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Mein linker Mundwinkel haengt ploetzlich, der linke Arm ist schwach und meine Sprache klingt verwaschen.',
  },
  {
    id: 'freetext-emergency-suicidal-intent',
    name: 'Freitext akute Suizidgefahr',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich möchte mein Leben beenden und bin gerade allein zu Hause.',
  },
  {id: 'freetext-emergency-severe-allergic-reaction',
    name: 'Freitext schwere allergische Reaktion',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich habe vorhin Nüsse gegessen und plötzlich starke Schwellungen im Gesicht, Atemnot und Juckreiz am ganzen Körper.',
  },
  {id: 'freetext-emergency-fall-with-head-injury',
    name: 'Freitext Sturz mit Kopfverletzung',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich bin aus 2m gestürzt und bin auf den Kopf gefallen. Ich habe starke Kopfschmerzen, Schwindel und Übelkeit.',
  },
  {id: 'freetext-emergency-alcohol-poisoning',
    name: 'Freitext akute Alkoholvergiftung',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich habe sehr viel Alkohol getrunken und fühle mich sehr benommen, mir ist übel und ich kann kaum noch stehen.',
  },
  {id: 'freetext-emergency-severe-burn',
    name: 'Freitext schwere Verbrennung',
    expectedCareLevel: 'emergency',
    patientData: adultPatientData,
    text: 'Ich habe mir beim Kochen die Hand an einer heißen Pfanne verbrannt. Die Haut ist jetzt sehr rot, Blasen bilden sich und ich habe starke Schmerzen.',
  },
]
