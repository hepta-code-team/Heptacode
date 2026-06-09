import { beforeEach, describe, expect, it, vi } from 'vitest'

import { evaluateTriage } from '../../../../src/modules/triage/triage.service.js'
import { evaluateAssessmentWithAi } from '../../../../src/modules/assessment/assessment.service.js'
import type { AssessmentPayload } from '../../../../src/modules/assessment/assessment.types.js'

vi.mock('../../../../src/modules/triage/triage.service.js', () => ({
  evaluateTriage: vi.fn(),
}))

const evaluateTriageMock = vi.mocked(evaluateTriage)

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
      allergies: '',
      medications: '',
      substanceInfluence: '',
      recentAbroad: false,
      recentAbroadDetails: '',
      conditions: ['Asthma'],
      isSmoker: false,
      smokingSinceYears: '',
      cigarettesPerDay: '',
      conditionDetails: {},
    },
    selectedSymptoms: [{ region: 'Kopf', side: 'links' }],
    symptomDetails: [
      {
        id: 'symptom-1',
        region: 'Kopf',
        side: 'links',
        details: 'Seit dem Aufwachen schlimmer',
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'days',
        active: true,
      },
    ],
  }
}

describe('evaluateAssessmentWithAi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt ein gueltiges Triage-Ergebnis mit createdAt zurueck', async () => {
    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
      summary: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden zeitnah abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
    })
    expect(Date.parse(result.createdAt)).not.toBeNaN()
    expect(evaluateTriageMock).toHaveBeenCalledTimes(1)
    expect(evaluateTriageMock).toHaveBeenCalledWith(
      createPayload().patientData,
      [
        {
          region: 'Kopf',
          side: 'links',
          details: 'Seit dem Aufwachen schlimmer',
          measurementType: 'pain',
          measurementValue: 7,
          duration: 'days',
        },
      ],
    )
  })

  it('nutzt eine Fallback-Review-Summary, wenn die Triage keine Summary liefert', async () => {
    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
    })
    expect(result.summary).toBe(result.reviewSummary.plainLanguage)
    expect(result.reviewSummary.professionalSummary).toContain('Geburtsjahr: 1990')
    expect(result.reviewSummary.professionalSummary).toContain('Kopf (links)')
    expect(result.reviewSummary.professionalSummary).toContain('Details: Seit dem Aufwachen schlimmer')
    expect(result.reviewSummary.professionalSummary).toContain('Schmerzstaerke: 7/10')
  })

  it('uebernimmt den aiUnavailable-Status aus der Triage', async () => {
    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'doctor',
      reasons: ['Fallback wurde genutzt.'],
      aiUnavailable: true,
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'doctor',
      reasons: ['Fallback wurde genutzt.'],
      aiUnavailable: true,
    })
  })

  it('reicht unerwartete Fehler weiter', async () => {
    evaluateTriageMock.mockRejectedValueOnce(new Error('boom'))

    await expect(evaluateAssessmentWithAi(createPayload())).rejects.toThrow('boom')
  })
})
