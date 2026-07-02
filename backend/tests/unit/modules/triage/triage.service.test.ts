import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AiResponseError } from '../../../../src/ai/timeout.js'
import { requestStructuredAiResponseWithModel } from '../../../../src/ai/llmAdapter.js'
import { extractSymptoms } from '../../../../src/modules/symptom-extraction/symptomExtraction.service.js'
import {
  evaluateTriage,
  evaluateTriageWithDiagnostics,
} from '../../../../src/modules/triage/triage.service.js'

vi.mock('../../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponseWithModel: vi.fn(),
}))

vi.mock('../../../../src/modules/symptom-extraction/symptomExtraction.service.js', () => ({
  extractSymptoms: vi.fn(),
}))

const requestStructuredAiResponseWithModelMock = vi.mocked(requestStructuredAiResponseWithModel)
const extractSymptomsMock = vi.mocked(extractSymptoms)

/** Shared male patient fixture for demographic plausibility checks. */
const malePatientData = {
  birthMonth: '05',
  birthYear: '1988',
  height: '175',
  weight: '78',
  gender: 'Maennlich',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  substanceInfluence: '',
  recentAbroad: '',
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: '',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
}

describe('evaluateTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Explicit emergency selection should bypass all model-dependent paths. */
  it('gibt bei Notfallauswahl direkt emergency zurueck', async () => {
    const result = await evaluateTriage(undefined, [], true)

    expect(result).toMatchObject({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  /** Missing symptoms should resolve to the deterministic empty-input self-care response. */
  it('gibt ohne Symptome selfcare zurueck und ruft keine KI auf', async () => {
    const result = await evaluateTriage(undefined, undefined)

    expect(result).toMatchObject({
      careLevel: 'selfcare',
      reasons: [],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  /** Valid AI triage responses should pass through with model metadata and prompt context. */
  it('uebernimmt eine gueltige KI-Triage mit Fachrichtung', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'specialist',
        recommendedSpecialty: 'neurology',
        reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: neurology.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      {
        region: 'Verbrennung',
        details: 'Kochendes Wasser ueber Arm geschuettet',
        measurementType: 'severity',
        measurementValue: 7,
        duration: 'today',
      },
    ])

    expect(result).toEqual({
      careLevel: 'specialist',
      recommendedSpecialty: 'neurology',
      reasons: ['Die Beschwerden sollten neurologisch abgeklaert werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden neurologisch abklaeren.',
        professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: neurology.',
      },
      aiModel: 'test-model',
    })
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'triage_result',
      }),
    )
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Details: Kochendes Wasser ueber Arm geschuettet'),
          }),
        ]),
      }),
    )
  })

  /** AI prompts should receive the already calculated patient age. */
  it('uebergibt das vorberechnete Alter an die KI', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    await evaluateTriage({
      ...malePatientData,
      age: 22,
      birthMonth: '05',
      birthYear: '2004',
    }, [
      { region: 'Kopf', measurementType: 'pain', measurementValue: 5, duration: 'days' },
    ])

    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('uebergebene Alter'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Stammdaten:\nAlter: 22 Jahre\nGroesse: 175'),
          }),
        ]),
      }),
    )
    const userPrompt = requestStructuredAiResponseWithModelMock.mock.calls[0]?.[0].messages[1]?.content
    expect(userPrompt).not.toContain('Geburtsmonat')
    expect(userPrompt).not.toContain('Geburtsjahr')
  })

  /** Medication and duration should be sent as active triage context, not just demographics. */
  it('hebt Medikamente und Einnahmedauer als eigenen Triage-Kontext hervor', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Ein moeglicher zeitlicher Zusammenhang mit Ramipril sollte aerztlich geprueft werden.'],
        reviewSummary: {
          plainLanguage: 'Der Schwindel kann zeitlich mit Ramipril zusammenhaengen und sollte aerztlich geprueft werden.',
          professionalSummary: 'Schwindel nach Beginn einer Ramipril-Einnahme; medikationsbezogene Abklaerung empfohlen.',
        },
      },
      model: 'test-model',
    })

    await evaluateTriage({
      ...malePatientData,
      medications: 'Ramipril 5 mg',
      medicationDuration: 'seit 3 Tagen',
    }, [
      { region: 'Allgemein', side: 'Schwindel', measurementType: 'severity', measurementValue: 5, duration: 'days' },
    ])

    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringMatching(/Medikationskontext aktiv[\s\S]*zeitlichen Zusammenhang/),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(
              'Medikationskontext (bei der Triage aktiv pruefen):\nAktuelle Medikamente: Ramipril 5 mg\nEinnahmedauer: seit 3 Tagen',
            ),
          }),
        ]),
      }),
    )
  })

  /** Missing medication duration should remain explicit in the prompt context. */
  it('kennzeichnet eine fehlende Einnahmedauer im Medikationskontext', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Aerztliche Abklaerung empfohlen.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    await evaluateTriage({
      ...malePatientData,
      medications: 'Metformin',
    }, [
      { region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'days' },
    ])

    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Aktuelle Medikamente: Metformin\nEinnahmedauer: Nicht angegeben'),
          }),
        ]),
      }),
    )
  })

  /** Medical risk factors should be grouped into the dedicated triage risk context. */
  it('hebt Allergien, Substanzeinfluss, Reisen und Vorerkrankungen als Risikokontext hervor', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Vorerkrankungen und der kuerzliche Auslandsaufenthalt sollten aerztlich eingeordnet werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden unter Beruecksichtigung Ihrer Vorerkrankungen aerztlich abklaeren.',
          professionalSummary: 'Relevanter Reise- und Vorerkrankungskontext; aerztliche Abklaerung empfohlen.',
        },
      },
      model: 'test-model',
    })

    await evaluateTriage({
      ...malePatientData,
      allergies: 'Penicillin',
      substanceInfluence: 'Alkohol',
      recentAbroad: "Ja",
      recentAbroadDetails: 'Thailand, Rueckkehr vor 5 Tagen',
      conditions: ['Asthma', 'Diabetes'],
      conditionDetails: {
        Asthma: { condition: 'Asthma', detail: 'allergisches Asthma', duration: 'seit 10 Jahren' },
        Diabetes: { condition: 'Diabetes', detail: 'Typ 2', duration: 'seit 4 Jahren' },
      },
    }, [
      { region: 'Allgemein', side: 'Fieber', measurementType: 'temperature', measurementValue: 39, duration: 'days' },
    ])

    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringMatching(/medizinischen Risikokontext[\s\S]*Allergien[\s\S]*Alkohol[\s\S]*Auslandsaufenthalt[\s\S]*Vorerkrankungen/),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining([
              'Medizinischer Risikokontext (bei der Triage aktiv pruefen):',
              'Allergien: Penicillin',
              'Einfluss durch Alkohol oder Drogen: Alkohol',
              'Auslandsaufenthalt in den letzten 3 Monaten: Thailand, Rueckkehr vor 5 Tagen',
              'Vorerkrankungen: Asthma, Diabetes',
              'Details und Dauer der Vorerkrankungen: Asthma: allergisches Asthma, Dauer: seit 10 Jahren; Diabetes: Typ 2, Dauer: seit 4 Jahren',
            ].join('\n')),
          }),
        ]),
      }),
    )
  })

  /** AI request availability failures should use the conservative local triage fallback. */
  it('nutzt den konservativen Triage-Fallback bei KI-Verfuegbarkeitsfehlern', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Brust', measurementType: 'pain', measurementValue: 8, duration: 'today' },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      aiUnavailable: true,
    })
    expect(result.reasons).toHaveLength(2)
  })

  /** Plausibility checks should reject unsafe self-care responses for warning symptoms. */
  it('verwirft unplausible Selfcare-KI-Antworten bei Warnsymptomen', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden koennen zunaechst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden koennen zunaechst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      {
        region: 'Brust',
        details: 'Druckgefuehl mit Atemnot',
        measurementType: 'pain',
        measurementValue: 5,
        duration: 'today',
      },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
    expect(result).not.toHaveProperty('aiModel')
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Die KI-Antwort wurde verworfen, weil sie die Plausibilitaetspruefung nicht bestanden hat.',
        'Warnsymptome dürfen nicht als selfcare eingestuft werden.',
      ]),
    )
  })

  /** Diagnostic evaluation should preserve the rejected AI answer and the final safety fallback. */
  it('stellt verworfene KI-Antwort und finalen Sicherheitsfallback getrennt bereit', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden koennen zunaechst beobachtet werden.'],
        reviewSummary: {
          plainLanguage: 'Die Beschwerden koennen zunaechst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare.',
        },
      },
      model: 'test-model',
    })

    const diagnostics = await evaluateTriageWithDiagnostics(undefined, [
      {
        region: 'Brust',
        details: 'Druckgefuehl mit Atemnot',
        measurementType: 'pain',
        measurementValue: 5,
        duration: 'today',
      },
    ])

    expect(diagnostics).toMatchObject({
      aiResponse: {
        careLevel: 'selfcare',
        aiModel: 'test-model',
      },
      finalResponse: {
        careLevel: 'emergency',
        aiUnavailable: true,
      },
      fallbackType: 'plausibility',
    })
    expect(diagnostics.plausibilityIssues).toContain(
      'Warnsymptome dürfen nicht als selfcare eingestuft werden.',
    )
  })

  /** Diagnostic evaluation should keep matching AI and system results without a fallback. */
  it('meldet bei plausibler KI-Antwort keinen Fallback', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich eingeordnet werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich einordnen.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    const diagnostics = await evaluateTriageWithDiagnostics(undefined, [
      {
        region: 'Bauch',
        measurementType: 'pain',
        measurementValue: 5,
        duration: 'days',
      },
    ])

    expect(diagnostics).toMatchObject({
      aiResponse: {
        careLevel: 'doctor',
        aiModel: 'test-model',
      },
      finalResponse: {
        careLevel: 'doctor',
        aiModel: 'test-model',
      },
      plausibilityIssues: [],
      fallbackType: 'none',
    })
  })

  /** Negated dyspnea should not turn mild chest-wall pain into an emergency fallback. */
  it('behaelt Selfcare bei mildem Brustwandschmerz ohne Atemnot bei', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'selfcare',
        reasons: ['Die Beschwerden entsprechen einem milden Muskelkater ohne Warnzeichen.'],
        reviewSummary: {
          plainLanguage: 'Der milde Muskelkater kann zunächst selbst beobachtet werden.',
          professionalSummary: 'Care Level: selfcare without warning signs.',
        },
      },
      model: 'test-model',
    })

    const diagnostics = await evaluateTriageWithDiagnostics(undefined, [
      {
        region: 'Brust',
        details: 'Leichter Muskelkater nach Liegestuetzen ohne Atemnot',
        measurementType: 'pain',
        measurementValue: 2,
        duration: 'today',
      },
    ])

    expect(diagnostics).toMatchObject({
      aiResponse: {
        careLevel: 'selfcare',
      },
      finalResponse: {
        careLevel: 'selfcare',
      },
      plausibilityIssues: [],
      fallbackType: 'none',
    })
  })

  /** Plausibility checks should reject emergency escalation for clearly mild symptoms. */
  it('verwirft unplausible Emergency-KI-Antworten bei milden Beschwerden', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'emergency',
        reasons: ['Die Beschwerden werden als Notfall eingestuft.'],
        reviewSummary: {
          plainLanguage: 'Bitte suchen Sie sofort medizinische Hilfe.',
          professionalSummary: 'Care Level: emergency.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Kopf', measurementType: 'pain', measurementValue: 2, duration: 'today' },
    ])

    expect(result).toMatchObject({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      aiUnavailable: true,
    })
    expect(result.reasons).toContain(
      'Milde Beschwerden ohne Warnzeichen dürfen nicht als emergency eingestuft werden.',
    )
  })

  /** Plausibility checks should reject doctor responses that recommend specialist care in text. */
  it('verwirft Doctor-KI-Antworten mit fachaerztlicher Empfehlung im Text', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten kardiologisch abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden kardiologisch abklaeren.',
          professionalSummary: 'Care Level: doctor. Empfehlung zur Kardiologie.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Brust', measurementType: 'pain', measurementValue: 4, duration: 'days' },
    ])

    expect(result).toMatchObject({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      aiUnavailable: true,
    })
    expect(result).not.toHaveProperty('aiModel')
    expect(result.reasons).toContain(
      'Wenn eine Fachrichtung genannt wird, muss diese auch als Empfehlung eingestuft werden.',
    )
  })

  /** Mental-health warning patterns should escalate in the local fallback path. */
  it('nutzt den Notfall-Fallback bei psychischen Warnmustern', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      {
        region: 'Psychische Probleme',
        side: 'Suizidgedanken',
        measurementType: 'severity',
        measurementValue: 3,
        duration: 'today',
      },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
    expect(result.reasons.join(' ')).toContain('Warnmuster')
  })

  /** Confusion should escalate in the local fallback path. */
  it('nutzt den Notfall-Fallback bei Verwirrtheit', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      {
        region: 'Allgemein',
        side: 'Verwirrtheit',
        measurementType: 'feeling',
        measurementValue: 4,
        duration: 'today',
      },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
  })

  /** Shared warning-pattern detection should also protect the local fallback path. */
  it.each([
    {
      name: 'Schlaganfallzeichen',
      symptom: {
        region: 'Gesicht',
        details: 'Ein Mundwinkel haengt, ein Arm ist halbseitig schwach und die Sprache verwaschen',
        measurementType: 'severity' as const,
        measurementValue: 5,
        duration: 'today' as const,
      },
    },
    {
      name: 'allergische Atemwegsschwellung',
      symptom: {
        region: 'Allgemein',
        details: 'Allergische Reaktion, Zunge und Hals schwellen an',
        measurementType: 'severity' as const,
        measurementValue: 5,
        duration: 'today' as const,
      },
    },
    {
      name: 'kritischen Blutungszeichen',
      symptom: {
        region: 'Bauch',
        details: 'Blutiges Erbrechen und schwarzer Stuhl seit heute',
        measurementType: 'severity' as const,
        measurementValue: 5,
        duration: 'today' as const,
      },
    },
  ])('nutzt den Notfall-Fallback bei $name', async ({ symptom }) => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [symptom])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
    expect(result.reasons.join(' ')).toContain('Warnmuster')
  })

  /** Very high symptom intensity should escalate even without a named warning pattern. */
  it('nutzt den Notfall-Fallback bei sehr starken Beschwerden ohne spezielles Warnmuster', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Ruecken', measurementType: 'pain', measurementValue: 8, duration: 'today' },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
    expect(result.reasons.join(' ')).toContain('sehr starken Beschwerden')
  })

  /** Very high fever should use the emergency fallback when AI triage is unavailable. */
  it('nutzt den Notfall-Fallback bei sehr hohem Fieber', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      {
        region: 'Allgemein',
        side: 'Fieber',
        measurementType: 'temperature',
        measurementValue: 40,
        duration: 'today',
      },
    ])

    expect(result).toMatchObject({
      careLevel: 'emergency',
      recommendedSpecialty: 'emergency_medicine',
      aiUnavailable: true,
    })
    expect(result.reasons.join(' ')).toContain('sehr starken Beschwerden')
  })

  /** Moderate fever should stay at doctor-level fallback when no warning pattern is present. */
  it('nutzt den Doctor-Fallback bei moderatem Fieber ohne Warnmuster', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      {
        region: 'Allgemein',
        side: 'Fieber',
        measurementType: 'temperature',
        measurementValue: 39,
        duration: 'days',
      },
    ])

    expect(result).toMatchObject({
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      aiUnavailable: true,
    })
  })

  /** Successful AI triage should not be locally promoted to specialist without a specialty. */
  it('eskaliert eine erfolgreiche KI-Triage nicht lokal zu specialist', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Bauch', measurementType: 'pain', measurementValue: 7, duration: 'days' },
    ])

    expect(result).toEqual({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      aiModel: 'test-model',
    })
  })

  /** AI responses that include specialist disciplines should normalize to specialist care. */
  it('normalisiert widerspruechliche KI-Antworten mit Fachrichtung zu specialist', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        recommendedSpecialty: 'orthopedics',
        reasons: ['Die Beschwerden sollten orthopaedisch abgeklaert werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden orthopaedisch abklaeren.',
          professionalSummary: 'Care Level: doctor. Empfohlene Fachrichtung: orthopedics.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Huefte', measurementType: 'pain', measurementValue: 7, duration: 'weeks' },
    ])

    expect(result).toMatchObject({
      careLevel: 'specialist',
      recommendedSpecialty: 'orthopedics',
      aiModel: 'test-model',
    })
  })

  /** Specialist AI decisions should remain authoritative for orthopedic cases. */
  it('uebernimmt die KI-Entscheidung fuer orthopaedische Beschwerden ohne lokale Facharztkorrektur', async () => {
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'specialist',
        recommendedSpecialty: 'orthopedics',
        reasons: ['Die Beschwerden sollten fachaerztlich abgeklaert werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden fachaerztlich abklaeren.',
          professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: orthopedics.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(undefined, [
      { region: 'Ruecken', measurementType: 'pain', measurementValue: 7, duration: 'weeks' },
    ])

    expect(result).toEqual({
      careLevel: 'specialist',
      recommendedSpecialty: 'orthopedics',
      reasons: ['Die Beschwerden sollten fachaerztlich abgeklaert werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden fachaerztlich abklaeren.',
        professionalSummary: 'Care Level: specialist. Empfohlene Fachrichtung: orthopedics.',
      },
      aiModel: 'test-model',
    })
  })

  /** Medium-intensity symptoms should use doctor-level fallback when AI is unavailable. */
  it('nutzt den Doctor-Fallback bei mittleren Beschwerden', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, [
      { region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'days' },
    ])

    expect(result).toMatchObject({
      careLevel: 'doctor',
      aiUnavailable: true,
    })
  })

  /** Invalid extracted free text should become a triage bad-request error. */
  it('wandelt ungueltigen Freitext in einen Bad-Request-Fehler um', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Hallo',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: 'Bitte beschreiben Sie konkrete Beschwerden.',
    })

    await expect(
      evaluateTriage(undefined, undefined, false, 'Hallo'),
    ).rejects.toMatchObject({
      message: 'Bitte beschreiben Sie konkrete Beschwerden.',
      statusCode: 400,
    })
  })

  /** Demographic contradictions in free text should stop before extraction or triage. */
  it('bricht bei maennlichem Geschlecht und Schwangerschaftsangaben im Freitext ab', async () => {
    await expect(
      evaluateTriage(
        malePatientData,
        undefined,
        false,
        'Ich waere schwanger und habe Wehen.',
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining('passen logisch nicht zusammen'),
      statusCode: 400,
    })

    expect(extractSymptomsMock).not.toHaveBeenCalled()
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  /** Demographic contradictions in structured symptoms should stop before triage AI execution. */
  it('bricht bei maennlichem Geschlecht und Schwangerschaftsangaben in Symptomen ab', async () => {
    await expect(
      evaluateTriage(malePatientData, [
        {
          region: 'Bauch',
          details: 'Schwanger und Wehen seit heute',
          measurementType: 'pain',
          measurementValue: 8,
          duration: 'today',
        },
      ]),
    ).rejects.toMatchObject({
      message: expect.stringContaining('passen logisch nicht zusammen'),
      statusCode: 400,
    })

    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  /** Extraction availability failures should return the text-extraction fallback triage result. */
  it('nutzt den Freitext-Fallback, wenn die Symptom-Extraktion nicht verfuegbar ist', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich habe starke Schmerzen.',
      inputType: 'text',
      symptoms: [],
      aiUnavailable: true,
    })

    const result = await evaluateTriage(
      undefined,
      undefined,
      false,
      'Ich habe starke Schmerzen.',
    )

    expect(result).toMatchObject({
      careLevel: 'doctor',
      aiUnavailable: true,
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
  })

  /** Extracted symptoms should feed the shared AI triage path for free-text requests. */
  it('verwendet extrahierte Symptome fuer die KI-Triage', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich habe seit Tagen Husten.',
      inputType: 'speech',
      symptoms: [{ region: 'Allgemein', measurementType: 'pain', measurementValue: 4, duration: 'days' }],
    })
    requestStructuredAiResponseWithModelMock.mockResolvedValueOnce({
      data: {
        careLevel: 'doctor',
        reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
        reviewSummary: {
          plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
          professionalSummary: 'Care Level: doctor.',
        },
      },
      model: 'test-model',
    })

    const result = await evaluateTriage(
      undefined,
      undefined,
      false,
      'Ich habe seit Tagen Husten.',
      'speech',
    )

    expect(result).toEqual({
      careLevel: 'doctor',
      reasons: ['Die Beschwerden sollten aerztlich abgeklart werden.'],
      reviewSummary: {
        plainLanguage: 'Bitte lassen Sie die Beschwerden aerztlich abklaeren.',
        professionalSummary: 'Care Level: doctor.',
      },
      aiModel: 'test-model',
    })
    expect(extractSymptomsMock).toHaveBeenCalledWith('Ich habe seit Tagen Husten.', 'speech')
    expect(requestStructuredAiResponseWithModelMock).toHaveBeenCalledTimes(1)
  })

  /** Empty extraction results should still receive a deterministic fallback if AI triage fails. */
  it('nutzt Selfcare-Fallback, wenn aus Freitext keine Symptome extrahiert wurden und die KI-Triage ausfaellt', async () => {
    extractSymptomsMock.mockResolvedValueOnce({
      text: 'Ich bin unsicher.',
      inputType: 'text',
      symptoms: [],
    })
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new AiResponseError('timeout'))

    const result = await evaluateTriage(undefined, undefined, false, 'Ich bin unsicher.')

    expect(result).toMatchObject({
      careLevel: 'selfcare',
      recommendedSpecialty: 'home_care',
      aiUnavailable: true,
    })
  })

  /** Unexpected triage model errors should remain visible to callers. */
  it('reicht unerwartete Fehler aus der KI-Triage weiter', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new Error('boom'))

    await expect(
      evaluateTriage(undefined, [
        { region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'days' },
      ]),
    ).rejects.toThrow('boom')
  })

  /** Unexpected extraction errors should remain visible to callers. */
  it('reicht unerwartete Fehler aus der Symptom-Extraktion weiter', async () => {
    extractSymptomsMock.mockRejectedValueOnce(new Error('boom'))

    await expect(evaluateTriage(undefined, undefined, false, 'Ich habe Husten.')).rejects.toThrow(
      'boom',
    )
  })
})
