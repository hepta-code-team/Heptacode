/// <reference types="fhir" />

import { randomUUID } from 'node:crypto'
import type {
  AssessmentPayload,
  AssessmentResult,
  Symptom,
} from '../assessment/assessment.types.js'
import type { ConditionDetail } from '../../../../shared/patientData.types.js'

type AdministrativeGender = NonNullable<fhir4.Patient['gender']>

// This log shape is intentionally metadata-only and must not contain clinical content.
export interface FhirBundleLogSummary {
  generated: true
  bundleType: fhir4.Bundle['type']
  entryCount: number
  resourceTypes: string[]
}

// The generated FHIR document is user-facing in German, so display labels stay German.
const DURATION_LABELS: Record<Symptom['duration'], string> = {
  today: 'Seit heute',
  days: 'Seit ein paar Tagen',
  week: 'Seit einer Woche',
  weeks: 'Seit mehr als 2 Wochen',
}

const MEASUREMENT_LABELS: Record<Symptom['measurementType'], string> = {
  pain: 'Schmerzstärke',
  temperature: 'Temperatur',
  feeling: 'Beschwerdegefühl',
  severity: 'Schweregrad',
}

// FHIR document bundles can use local URN references between resources.
function createUuidUrn(id: string): string {
  return `urn:uuid:${id}`
}

function hasText(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0)
}

// FHIR only allows the administrative gender codes below.
function mapAdministrativeGender(gender: string): AdministrativeGender {
  switch (gender.trim().toLocaleLowerCase('de-DE')) {
    case 'männlich':
    case 'maennlich':
    case 'male':
      return 'male'

    case 'weiblich':
    case 'female':
      return 'female'

    case 'divers':
    case 'diverse':
    case 'other':
      return 'other'

    default:
      return 'unknown'
  }
}

// FHIR dates support reduced precision, so YYYY-MM is valid for a partial birth date.
function createPartialBirthDate(
  birthYear: string,
  birthMonth: string,
): string | undefined {
  const normalizedYear = birthYear.trim()
  const monthNumber = Number(birthMonth)

  if (
    !/^\d{4}$/.test(normalizedYear) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return undefined
  }

  return `${normalizedYear}-${String(monthNumber).padStart(2, '0')}`
}

// Formats optional condition details without adding empty placeholders.
function formatConditionDetail({ detail, duration }: ConditionDetail): string | null {
  const parts = [
    hasText(detail) ? detail.trim() : null,
    hasText(duration) ? `Dauer: ${duration.trim()}` : null,
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(', ') : null
}

// Keeps the Patient resource minimal and puts clinical context into ClinicalImpression notes.
function formatPatientContext(payload: AssessmentPayload): string {
  const { patientData } = payload
  const conditionDetails = Object.entries(patientData.conditionDetails)
    .map(([condition, detail]) => {
      const formattedDetail = formatConditionDetail(detail)
      return formattedDetail ? `${condition}: ${formattedDetail}` : null
    })
    .filter((detail): detail is string => detail !== null)

  const lines = [
    `Größe: ${patientData.height} cm`,
    `Gewicht: ${patientData.weight} kg`,
    `Geschlecht: ${patientData.gender}`,
    `Schwanger: ${patientData.isPregnant ? 'Ja' : 'Nein'}`,
    `Stillend: ${patientData.isBreastfeeding ? 'Ja' : 'Nein'}`,
    hasText(patientData.allergies) ? `Allergien: ${patientData.allergies.trim()}` : null,
    hasText(patientData.medications) ? `Medikamente: ${patientData.medications.trim()}` : null,
    hasText(patientData.medicationDuration)
      ? `Einnahmedauer Medikamente: ${patientData.medicationDuration.trim()}`
      : null,
    hasText(patientData.substanceInfluence) && patientData.substanceInfluence.trim() !== 'Nein'
      ? `Substanzbeeinflussung: ${patientData.substanceInfluence.trim()}`
      : null,
    patientData.recentAbroad === 'Ja'
      ? `Auslandsaufenthalt letzte 3 Monate: ${
          hasText(patientData.recentAbroadDetails)
            ? patientData.recentAbroadDetails.trim()
            : 'Ja'
        }`
      : null,
    patientData.conditions.length > 0
      ? `Vorerkrankungen: ${patientData.conditions.join(', ')}`
      : null,
    patientData.isSmoker ? `Raucher: ${patientData.isSmoker}` : 'Raucher: Keine Angabe',
    patientData.isSmoker !== '' && patientData.isSmoker !== 'Nein' && patientData.isSmoker !== 'Nie' && hasText(patientData.smokingSinceYears)
      ? `Rauchdauer: ${patientData.smokingSinceYears.trim()}`
      : null,
    patientData.isSmoker !== '' && patientData.isSmoker !== 'Nein' && patientData.isSmoker !== 'Nie' && hasText(patientData.cigarettesPerDay)
      ? `Rauchmenge: ${patientData.cigarettesPerDay.trim()}`
      : null,
    conditionDetails.length > 0
      ? `Details zu Vorerkrankungen: ${conditionDetails.join('; ')}`
      : null,
  ].filter((line): line is string => line !== null)

  return lines.join('\n')
}

// Provides a readable list of initially selected symptoms for the clinical note.
function formatSelectedSymptoms(payload: AssessmentPayload): string {
  if (payload.selectedSymptoms.length === 0) {
    return 'Keine vorausgewählten Symptome übergeben.'
  }

  return payload.selectedSymptoms
    .map((symptom, index) => {
      const side = symptom.side ? ` (${symptom.side})` : ''
      return `${index + 1}. ${symptom.region}${side}`
    })
    .join('\n')
}

// Includes active symptom details; falls back to all symptoms if none are explicitly active.
function formatSymptomDetails(payload: AssessmentPayload): string {
  const symptomsToFormat = payload.symptomDetails.some((symptom) => symptom.active)
    ? payload.symptomDetails.filter((symptom) => symptom.active)
    : payload.symptomDetails

  return symptomsToFormat
    .map((symptom, index) => {
      const side = symptom.side ? ` (${symptom.side})` : ''
      const measurementLabel = MEASUREMENT_LABELS[symptom.measurementType]
      const unit = symptom.measurementType === 'temperature' ? '°C' : '/10'
      const duration = DURATION_LABELS[symptom.duration]

      return [
        `${index + 1}. ${symptom.region}${side}`,
        hasText(symptom.details) ? `Details: ${symptom.details.trim()}` : null,
        `${measurementLabel}: ${symptom.measurementValue}${unit}`,
        `Dauer: ${duration}`,
      ]
        .filter((part): part is string => part !== null)
        .join(', ')
    })
    .join('\n')
}

// ClinicalImpression.note is the best place for readable triage details in this first version.
function buildClinicalNotes(
  payload: AssessmentPayload,
  result: AssessmentResult,
): NonNullable<fhir4.ClinicalImpression['note']> {
  return [
    {
      text: `Empfohlene Versorgungsebene: ${result.careLevel}`,
    },
    ...(result.recommendedSpecialty
      ? [
          {
            text: `Empfohlene Fachrichtung: ${result.recommendedSpecialty}`,
          },
        ]
      : []),
    {
      text: `Begründungen:\n${result.reasons.map((reason) => `- ${reason}`).join('\n')}`,
    },
    {
      text: `Ausgewählte Symptome:\n${formatSelectedSymptoms(payload)}`,
    },
    {
      text: `Detailangaben zu aktiven Symptomen:\n${formatSymptomDetails(payload)}`,
    },
    {
      text: `Patientenkontext:\n${formatPatientContext(payload)}`,
    },
  ]
}

// Builds an in-memory FHIR R4 document bundle after the final assessment result exists.
// This function does not send, store, or log the full bundle.
export function buildFhirBundle(
  payload: AssessmentPayload,
  result: AssessmentResult,
): fhir4.Bundle {
  // Each resource gets a local UUID so bundle entries can reference each other safely.
  const bundleId = randomUUID()
  const compositionId = randomUUID()
  const patientId = randomUUID()
  const deviceId = randomUUID()
  const clinicalImpressionId = randomUUID()

  const bundleUrl = createUuidUrn(bundleId)
  const compositionUrl = createUuidUrn(compositionId)
  const patientUrl = createUuidUrn(patientId)
  const deviceUrl = createUuidUrn(deviceId)
  const clinicalImpressionUrl = createUuidUrn(clinicalImpressionId)

  const birthDate = createPartialBirthDate(
    payload.patientData.birthYear,
    payload.patientData.birthMonth,
  )

  // Patient intentionally contains no name, address, phone number, or insurance identifier.
  const patient: fhir4.Patient = {
    resourceType: 'Patient',
    id: patientId,
    active: true,
    gender: mapAdministrativeGender(payload.patientData.gender),
    ...(birthDate ? { birthDate } : {}),
  }

  // Device identifies HeptaCheck as the source system that produced the assessment.
  const device: fhir4.Device = {
    resourceType: 'Device',
    id: deviceId,
    status: 'active',
    deviceName: [
      {
        name: 'HeptaCheck',
        type: 'user-friendly-name',
      },
      ...(result.aiModel
        ? [
            {
              name: result.aiModel,
              type: 'model-name' as const,
            },
          ]
        : []),
    ],
  }

  // ClinicalImpression carries the actual triage result and readable medical context.
  const clinicalImpression: fhir4.ClinicalImpression = {
    resourceType: 'ClinicalImpression',
    id: clinicalImpressionId,
    status: 'completed',
    code: {
      text: 'Digitale medizinische Ersteinschätzung',
    },
    description:
      'Automatisiert erstellte Ersteinschätzung auf Grundlage der eingegebenen Patientendaten und Symptome.',
    subject: {
      reference: patientUrl,
    },
    effectiveDateTime: result.createdAt,
    date: result.createdAt,
    summary: result.reviewSummary.professionalSummary,
    finding: [
      {
        itemCodeableConcept: {
          text: `Empfohlene Versorgungsebene: ${result.careLevel}`,
        },
        basis: result.reasons.join('; '),
      },
    ],
    note: buildClinicalNotes(payload, result),
  }

  // Composition is the document index; it must be the first entry in a document bundle.
  const composition: fhir4.Composition = {
    resourceType: 'Composition',
    id: compositionId,
    identifier: {
      system: 'urn:ietf:rfc:3986',
      value: compositionUrl,
    },
    status: 'final',
    type: {
      text: 'HeptaCheck Ersteinschätzung',
    },
    subject: {
      reference: patientUrl,
    },
    date: result.createdAt,
    author: [
      {
        reference: deviceUrl,
        display: 'HeptaCheck',
      },
    ],
    title: 'HeptaCheck – Medizinische Ersteinschätzung',
    section: [
      {
        title: 'Ergebnis der Ersteinschätzung',
        entry: [
          {
            reference: clinicalImpressionUrl,
          },
        ],
      },
    ],
  }

  // Keep Composition first because Bundle.type = "document" expects it there.
  return {
    resourceType: 'Bundle',
    id: bundleId,
    identifier: {
      system: 'urn:ietf:rfc:3986',
      value: bundleUrl,
    },
    type: 'document',
    timestamp: result.createdAt,
    entry: [
      {
        fullUrl: compositionUrl,
        resource: composition,
      },
      {
        fullUrl: patientUrl,
        resource: patient,
      },
      {
        fullUrl: deviceUrl,
        resource: device,
      },
      {
        fullUrl: clinicalImpressionUrl,
        resource: clinicalImpression,
      },
    ],
  }
}

// Returns only structural metadata so logs can confirm generation without exposing patient data.
export function summarizeFhirBundleForLog(bundle: fhir4.Bundle): FhirBundleLogSummary {
  const resourceTypes =
    bundle.entry?.map((entry) => entry.resource?.resourceType ?? 'Unknown') ?? []

  return {
    generated: true,
    bundleType: bundle.type,
    entryCount: resourceTypes.length,
    resourceTypes,
  }
}

