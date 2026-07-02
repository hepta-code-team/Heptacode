/// <reference types="fhir" />

import { describe, expect, it } from 'vitest'
import type {
  AssessmentPayload,
  AssessmentResult,
} from '../../../../src/modules/assessment/assessment.types.js'
import {
  buildFhirBundle,
  summarizeFhirBundleForLog,
} from '../../../../src/modules/fhir/fhirBundle.js'

function createPayload(): AssessmentPayload {
  return {
    patientData: {
      birthMonth: '01',
      birthYear: '1990',
      height: '170',
      weight: '70',
      gender: 'female',
      isPregnant: false,
      isBreastfeeding: false,
      allergies: 'Penicillin',
      medications: 'Salbutamol',
      medicationDuration: 'bei Bedarf',
      substanceInfluence: '',
      recentAbroad: '',
      recentAbroadDetails: '',
      conditions: ['Asthma'],
      isSmoker: '',
      smokingSinceYears: '',
      cigarettesPerDay: '',
      conditionDetails: {
        Asthma: {
          condition: 'Asthma',
          detail: 'Belastungsasthma',
          duration: 'seit Kindheit',
        },
      },
    },
    selectedSymptoms: [{ region: 'Kopf', side: 'links' }],
    symptomDetails: [
      {
        id: 'symptom-1',
        region: 'Kopf',
        side: 'links',
        details: 'Pochende Kopfschmerzen',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'days',
        active: true,
      },
    ],
  }
}

function createResult(): AssessmentResult {
  return {
    careLevel: 'doctor',
    recommendedSpecialty: 'general_practice',
    reasons: ['Die Beschwerden sollten ärztlich eingeordnet werden.'],
    reviewSummary: {
      plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklären.',
      professionalSummary:
        'Patientin mit linksseitigen Kopfschmerzen seit einigen Tagen und Asthma in der Vorgeschichte.',
    },
    summary: 'Bitte lassen Sie die Beschwerden zeitnah abklären.',
    aiModel: 'test-model',
    createdAt: '2026-06-23T12:00:00.000Z',
  }
}

describe('buildFhirBundle', () => {
  /** FHIR exports should use the document bundle structure expected by downstream systems. */
  it('erstellt ein FHIR Document Bundle mit Composition, Patient, Device und ClinicalImpression', () => {
    const bundle = buildFhirBundle(createPayload(), createResult())

    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('document')
    expect(bundle.timestamp).toBe('2026-06-23T12:00:00.000Z')
    expect(bundle.entry?.map((entry) => entry.resource?.resourceType)).toEqual([
      'Composition',
      'Patient',
      'Device',
      'ClinicalImpression',
    ])
  })

  /** Patient resources should avoid unnecessary identifying contact details. */
  it('uebernimmt nur minimale Patientendaten in die Patient Resource', () => {
    const bundle = buildFhirBundle(createPayload(), createResult())
    const patient = bundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'Patient',
    )?.resource as fhir4.Patient | undefined

    expect(patient).toMatchObject({
      resourceType: 'Patient',
      active: true,
      gender: 'female',
      birthDate: '1990-01',
    })
    expect(patient?.name).toBeUndefined()
    expect(patient?.telecom).toBeUndefined()
    expect(patient?.address).toBeUndefined()
  })

  /** ClinicalImpression should carry the medical summary and symptom notes. */
  it('legt das medizinische Ergebnis in der ClinicalImpression ab', () => {
    const bundle = buildFhirBundle(createPayload(), createResult())
    const clinicalImpression = bundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'ClinicalImpression',
    )?.resource as fhir4.ClinicalImpression | undefined

    expect(clinicalImpression).toMatchObject({
      resourceType: 'ClinicalImpression',
      status: 'completed',
      summary:
        'Patientin mit linksseitigen Kopfschmerzen seit einigen Tagen und Asthma in der Vorgeschichte.',
    })
    expect(clinicalImpression?.note?.some((note) => note.text?.includes('Pochende Kopfschmerzen'))).toBe(
      true,
    )
    expect(clinicalImpression?.note?.some((note) => note.text?.includes('Asthma'))).toBe(true)
  })

  /** Log summaries should expose structure metadata without clinical content. */
  it('liefert fuer Logs nur Struktur-Metadaten ohne medizinische Inhalte', () => {
    const bundle = buildFhirBundle(createPayload(), createResult())
    const logSummary = summarizeFhirBundleForLog(bundle)
    const serializedLogSummary = JSON.stringify(logSummary)

    expect(logSummary).toEqual({
      generated: true,
      bundleType: 'document',
      entryCount: 4,
      resourceTypes: ['Composition', 'Patient', 'Device', 'ClinicalImpression'],
    })
    expect(serializedLogSummary).not.toContain('Asthma')
    expect(serializedLogSummary).not.toContain('Kopfschmerzen')
    expect(serializedLogSummary).not.toContain('Penicillin')
  })
})
