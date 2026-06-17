import { beforeEach, describe, expect, it, vi } from 'vitest'

import { evaluateTriage } from '../../../../src/modules/triage/triage.service.js'
import { evaluateAssessmentWithAi } from '../../../../src/modules/assessment/assessment.service.js'
import type { AssessmentPayload } from '../../../../src/modules/assessment/assessment.types.js'

vi.mock('../../../../src/modules/triage/triage.service.js', () => ({
  evaluateTriage: vi.fn(),
}))

const evaluateTriageMock = vi.mocked(evaluateTriage)

/** Complete assessment fixture used to exercise the service mapping layer. */
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

  /** Triage output should be adapted to the assessment response shape with timestamps. */
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

  /** Missing triage summaries should be replaced with deterministic assessment summaries. */
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

  /** AI availability state should pass through from triage to assessment callers. */
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

  /** Presentation defaults should fill empty triage fields required by the frontend. */
  it('fuellt Specialty, leere Reasons, aiModel und empfohlene Fachrichtungen auf', async () => {
    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'emergency',
      reasons: [],
      recommendedSpecialties: ['emergency_medicine', 'internal_medicine'],
      aiModel: 'test-model',
      reviewSummary: {
        plainLanguage: 'Bitte nehmen Sie dringend medizinische Hilfe in Anspruch.',
        professionalSummary: [
          'Zusammenfassung fuer Patient:innen: Bitte Hilfe suchen.',
          'Care Level: emergency.',
        ].join('\n'),
      },
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      recommendedSpecialties: ['emergency_medicine', 'internal_medicine'],
      reasons: [
        'Die Angaben wurden ausgewertet. Bei Verschlechterung bitte erneut medizinisch vorstellen.',
      ],
      aiModel: 'test-model',
      summary: 'Bitte nehmen Sie dringend medizinische Hilfe in Anspruch.',
    })
    expect(result.reviewSummary.professionalSummary).toContain('Care Level: emergency.')
  })

  /** Specialist triage without an explicit specialty should still provide a stable frontend default. */
  it('setzt Internal Medicine als Fallback-Specialty fuer Specialist-Ergebnisse', async () => {
    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'specialist',
      reasons: ['Eine fachaerztliche Abklaerung ist sinnvoll.'],
      reviewSummary: {
        plainLanguage: 'Bitte vereinbaren Sie einen fachaerztlichen Termin.',
        professionalSummary: 'Care Level: specialist.',
      },
    })

    const result = await evaluateAssessmentWithAi(createPayload())

    expect(result).toMatchObject({
      careLevel: 'specialist',
      recommendedSpecialty: 'internal_medicine',
      reasons: ['Eine fachaerztliche Abklaerung ist sinnvoll.'],
      summary: 'Bitte vereinbaren Sie einen fachaerztlichen Termin.',
    })
  })

  /** Optional patient data should be represented in generated fallback summaries. */
  it('uebernimmt vorhandene Specialty und baut Fallback-Summary mit optionalen Patientendaten', async () => {
    const payload = createPayload()
    payload.patientData.isPregnant = true
    payload.patientData.isBreastfeeding = true
    payload.patientData.allergies = 'Penicillin'
    payload.patientData.medications = 'Ibuprofen'
    payload.patientData.substanceInfluence = 'Alkohol'
    payload.patientData.recentAbroad = true
    payload.patientData.recentAbroadDetails = 'Spanien'
    payload.patientData.isSmoker = true
    payload.patientData.smokingSinceYears = '5'
    payload.patientData.cigarettesPerDay = '10'
    payload.patientData.conditionDetails = {
      Asthma: {
        condition: 'Asthma',
        detail: 'Belastungsasthma',
        duration: '',
      },
    }

    evaluateTriageMock.mockResolvedValueOnce({
      careLevel: 'selfcare',
      recommendedSpecialty: 'home_care',
      reasons: ['Aktuell sprechen die Angaben fuer Selbstversorgung.'],
    })

    const result = await evaluateAssessmentWithAi(payload)

    expect(result.recommendedSpecialty).toBe('home_care')
    expect(result.reviewSummary.professionalSummary).toContain('Schwanger: Ja')
    expect(result.reviewSummary.professionalSummary).toContain('Stillend: Ja')
    expect(result.reviewSummary.professionalSummary).toContain('Allergien: Penicillin')
    expect(result.reviewSummary.professionalSummary).toContain('Medikamente: Ibuprofen')
    expect(result.reviewSummary.professionalSummary).toContain('Substanzbeeinflussung: Alkohol')
    expect(result.reviewSummary.professionalSummary).toContain('Auslandsaufenthalt letzte 3 Monate: Spanien')
    expect(result.reviewSummary.professionalSummary).toContain('Rauchdauer: 5 Jahre')
    expect(result.reviewSummary.professionalSummary).toContain('Zigaretten pro Tag: 10')
    expect(result.reviewSummary.professionalSummary).toContain('Details zu Vorerkrankungen: Asthma: Belastungsasthma')
  })

  /** Unexpected triage failures should remain visible to callers. */
  it('reicht unerwartete Fehler weiter', async () => {
    evaluateTriageMock.mockRejectedValueOnce(new Error('boom'))

    await expect(evaluateAssessmentWithAi(createPayload())).rejects.toThrow('boom')
  })
})
