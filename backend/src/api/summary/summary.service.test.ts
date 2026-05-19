import { describe, expect, it } from 'vitest'

import { createSummaryService } from './summary.service.js'
import type { SummaryRequest } from './summary.types.js'

function createRequest(overrides: Partial<SummaryRequest> = {}): SummaryRequest {
  return {
    patient: {
      age: 34,
      sex: 'female',
      knownConditions: ['Asthma'],
      medications: ['Salbutamol'],
      allergies: [],
    },
    symptoms: {
      freeText: 'Seit gestern Husten und Fieber.',
      duration: 'seit gestern',
      severity: 4,
      location: 'Brust',
      progression: 'same',
    },
    consent: {
      acceptedDataProcessing: true,
    },
    ...overrides,
  }
}

describe('createSummaryService', () => {
  it('verlangt Zustimmung zur Datenverarbeitung', async () => {
    await expect(
      createSummaryService(createRequest({
        consent: { acceptedDataProcessing: false },
      })),
    ).rejects.toThrow('CONSENT_REQUIRED')
  })

  it('stuft hohe Schweregrade als urgent ein', async () => {
    const result = await createSummaryService(createRequest({
      symptoms: {
        ...createRequest().symptoms,
        severity: 8,
      },
    }))

    expect(result.urgencyLevel).toBe('urgent')
    expect(result.recommendation.nextStep).toBe('medical_assessment_required')
    expect(result.humanReviewRequired).toBe(true)
  })

  it('stuft mittlere Schweregrade als soon ein', async () => {
    const result = await createSummaryService(createRequest({
      symptoms: {
        ...createRequest().symptoms,
        severity: 5,
      },
    }))

    expect(result.urgencyLevel).toBe('soon')
    expect(result.recommendation.nextStep).toBe('doctor_visit_recommended')
  })

  it('stuft Verschlechterung als soon ein', async () => {
    const result = await createSummaryService(createRequest({
      symptoms: {
        ...createRequest().symptoms,
        severity: 2,
        progression: 'worse',
      },
    }))

    expect(result.urgencyLevel).toBe('soon')
  })

  it('listet fehlende Symptomangaben auf', async () => {
    const result = await createSummaryService(createRequest({
      symptoms: {
        freeText: 'Ich fuehle mich krank.',
      },
    }))

    expect(result.urgencyLevel).toBe('self_care')
    expect(result.aiReviewSummary.missingInformation).toEqual([
      'Seit wann bestehen die Beschwerden?',
      'Wie stark sind die Beschwerden auf einer Skala von 0 bis 10?',
      'Werden die Beschwerden besser, gleichbleibend oder schlimmer?',
      'Wo genau treten die Beschwerden auf?',
    ])
  })
})
