import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AiResponseError } from '../../../../src/ai/timeout.js'
import { requestStructuredAiResponseWithModel } from '../../../../src/ai/llmAdapter.js'
import { extractSymptoms } from '../../../../src/modules/symptom-extraction/symptomExtraction.service.js'
import { evaluateTriage } from '../../../../src/modules/triage/triage.service.js'

vi.mock('../../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponseWithModel: vi.fn(),
}))

vi.mock('../../../../src/modules/symptom-extraction/symptomExtraction.service.js', () => ({
  extractSymptoms: vi.fn(),
}))

const requestStructuredAiResponseWithModelMock = vi.mocked(requestStructuredAiResponseWithModel)
const extractSymptomsMock = vi.mocked(extractSymptoms)

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
  substanceInfluence: 'Nein',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
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

  it('gibt bei Notfallauswahl direkt emergency zurueck', async () => {
    const result = await evaluateTriage(undefined, [], true)

    expect(result).toMatchObject({
      careLevel: 'emergency',
      reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.'],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

  it('gibt ohne Symptome selfcare zurueck und ruft keine KI auf', async () => {
    const result = await evaluateTriage(undefined, undefined)

    expect(result).toMatchObject({
      careLevel: 'selfcare',
      reasons: [],
    })
    expect(requestStructuredAiResponseWithModelMock).not.toHaveBeenCalled()
    expect(extractSymptomsMock).not.toHaveBeenCalled()
  })

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

  it('uebergibt das aktuelle Datum als Bezugsdatum fuer Altersberechnungen an die KI', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
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
            content: expect.stringContaining('Bezugsdatum fuer Altersberechnungen'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Aktuelles Datum:\n2026-06-15'),
          }),
        ]),
      }),
    )
  })

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

  it('nutzt den Fallback, wenn die KI-Anfrage fehlschlaegt', async () => {
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

  it('reicht unerwartete Fehler aus der KI-Triage weiter', async () => {
    requestStructuredAiResponseWithModelMock.mockRejectedValueOnce(new Error('boom'))

    await expect(
      evaluateTriage(undefined, [
        { region: 'Bauch', measurementType: 'pain', measurementValue: 5, duration: 'days' },
      ]),
    ).rejects.toThrow('boom')
  })

  it('reicht unerwartete Fehler aus der Symptom-Extraktion weiter', async () => {
    extractSymptomsMock.mockRejectedValueOnce(new Error('boom'))

    await expect(evaluateTriage(undefined, undefined, false, 'Ich habe Husten.')).rejects.toThrow(
      'boom',
    )
  })
})
