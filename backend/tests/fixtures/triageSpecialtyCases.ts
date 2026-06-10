import type { MedicalSpecialty, PatientData, TriageSymptom } from '../../src/modules/triage/triage.types.js'

export const SPECIALIST_MEDICAL_SPECIALTIES = [
  'internal_medicine',
  'cardiology',
  'neurology',
  'orthopedics',
  'gastroenterology',
  'pulmonology',
  'dermatology',
  'urology',
  'gynecology',
  'psychiatry',
  'pediatrics',
  'dentistry',
  'ophthalmology',
  'otolaryngology',
] as const satisfies readonly MedicalSpecialty[]

export type SpecialistMedicalSpecialty = (typeof SPECIALIST_MEDICAL_SPECIALTIES)[number]

export type TriageSpecialtyCase = {
  name: string
  expectedSpecialty: SpecialistMedicalSpecialty
  symptoms: TriageSymptom[]
  patientData?: PatientData
}

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
  substanceInfluence: 'Nein',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

const femalePatientData: PatientData = {
  ...adultPatientData,
  gender: 'Weiblich',
}

const childPatientData: PatientData = {
  ...adultPatientData,
  birthMonth: '03',
  birthYear: '2018',
  height: '128',
  weight: '27',
}

export const TRIAGE_SPECIALTY_CASES: TriageSpecialtyCase[] = [
  {
    name: 'Innere Medizin',
    expectedSpecialty: 'internal_medicine',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Seit mehreren Wochen Nachtschweiss, Gewichtsverlust und ausgepraegte Muedigkeit ohne akute Notfallsymptome',
        measurementType: 'severity',
        measurementValue: 7,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Kardiologie',
    expectedSpecialty: 'cardiology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Herz-Kreislauf',
        details: 'Wiederkehrendes Herzrasen und unregelmaessiger Puls seit zwei Wochen, aktuell keine Brustschmerzen und keine Atemnot in Ruhe',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Neurologie',
    expectedSpecialty: 'neurology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Kopf',
        details: 'Seit zwei Wochen wiederkehrende starke Kopfschmerzen mit Kribbeln in einer Hand, keine Laehmung, keine Sprachstoerung',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Orthopaedie',
    expectedSpecialty: 'orthopedics',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Huefte',
        details: 'Belastungsabhaengige Hueftschmerzen ohne Unfall, keine offene Wunde, keine akute Fehlstellung',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Gastroenterologie',
    expectedSpecialty: 'gastroenterology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Bauch',
        details: 'Wiederkehrende Oberbauchschmerzen, Sodbrennen und wechselnder Stuhlgang seit mehreren Wochen, kein Blut im Stuhl',
        measurementType: 'pain',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Pneumologie',
    expectedSpecialty: 'pulmonology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Atmung',
        details: 'Anhaltender Husten mit pfeifender Atmung bei Belastung seit mehreren Wochen, keine akute Atemnot in Ruhe',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Dermatologie',
    expectedSpecialty: 'dermatology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Haut',
        details: 'Juckender roetlicher Hautausschlag an beiden Armen seit zwei Wochen, keine Atemnot, keine Kreislaufprobleme',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Urologie',
    expectedSpecialty: 'urology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Urogenital',
        details: 'Brennen beim Wasserlassen und haeufiger Harndrang seit einer Woche, keine Flankenschmerzen, kein Fieber',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'week',
      },
    ],
  },
  {
    name: 'Gynaekologie',
    expectedSpecialty: 'gynecology',
    patientData: femalePatientData,
    symptoms: [
      {
        region: 'Unterleib',
        details: 'Ungewoehnliche Zwischenblutungen und Unterleibsschmerzen seit zwei Wochen, nicht schwanger, keine starke akute Blutung',
        measurementType: 'pain',
        measurementValue: 6,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Psychiatrie',
    expectedSpecialty: 'psychiatry',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Psychische Probleme',
        details: 'Wiederkehrende Panikattacken, Schlafstoerungen und depressive Stimmung seit mehreren Wochen, keine Suizidgedanken',
        measurementType: 'severity',
        measurementValue: 7,
        duration: 'weeks',
      },
    ],
  },
  {
    name: 'Kinderheilkunde',
    expectedSpecialty: 'pediatrics',
    patientData: childPatientData,
    symptoms: [
      {
        region: 'Allgemein',
        details: 'Kind mit seit einer Woche wiederkehrendem Fieber, Husten und Bauchweh, aktuell trinkend und ansprechbar',
        measurementType: 'severity',
        measurementValue: 6,
        duration: 'week',
      },
    ],
  },
  {
    name: 'Zahnmedizin',
    expectedSpecialty: 'dentistry',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Mund',
        details: 'Starke Zahnschmerzen an einem Backenzahn mit Kaubeschwerden seit mehreren Tagen, keine Atemnot, keine Schluckstoerung',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'days',
      },
    ],
  },
  {
    name: 'Augenheilkunde',
    expectedSpecialty: 'ophthalmology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Auge',
        details: 'Einseitige Augenschmerzen, Roetung und verschwommenes Sehen seit mehreren Tagen, keine ploetzliche Erblindung',
        measurementType: 'pain',
        measurementValue: 6,
        duration: 'days',
      },
    ],
  },
  {
    name: 'HNO',
    expectedSpecialty: 'otolaryngology',
    patientData: adultPatientData,
    symptoms: [
      {
        region: 'Ohr Nase Rachen',
        details: 'Einseitige Ohrenschmerzen, Druckgefuehl und vermindertes Hoeren seit einer Woche, kein hohes Fieber',
        measurementType: 'pain',
        measurementValue: 6,
        duration: 'week',
      },
    ],
  },
]
