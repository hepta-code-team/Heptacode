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
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
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
    text: 'Ich habe konkrete Suizidgedanken mit einem Plan und bin gerade allein zu Hause.',
  },
]
