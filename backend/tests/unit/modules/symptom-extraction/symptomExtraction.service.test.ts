import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../../src/ai/timeout.js'
import {
  extractSymptoms,
  validateSymptomInput,
} from '../../../../src/modules/symptom-extraction/symptomExtraction.service.js'

vi.mock('../../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

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

describe('extractSymptoms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('faengt offensichtlich zu kurze Eingaben ohne KI-Aufruf ab', async () => {
    const result = await extractSymptoms('aua')

    expect(result).toMatchObject({
      text: 'aua',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('faengt widerspruechliche Schwangerschaftsangaben vor der KI-Auswertung ab', async () => {
    const result = await extractSymptoms(
      'Ich waere schwanger und habe Wehen.',
      'text',
      malePatientData,
    )

    expect(result).toMatchObject({
      text: 'Ich waere schwanger und habe Wehen.',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: expect.stringContaining('passen logisch nicht zusammen'),
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('gibt ungueltige medizinische Eingaben aus der KI-Validierung zurueck', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: false,
      reason: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })

    const result = await extractSymptoms('Ich mag Pizza und Filme.')

    expect(result).toEqual({
      text: 'Ich mag Pizza und Filme.',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'symptom_input_validation_result',
        modelStrategy: 'fallback-only',
      }),
    )
  })

  it('extrahiert Symptome nach erfolgreicher Validierung', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
      })

    const result = await extractSymptoms('Ich habe seit Tagen Kopfschmerzen 6 von 10.', 'speech')

    expect(result).toEqual({
      text: 'Ich habe seit Tagen Kopfschmerzen 6 von 10.',
      inputType: 'speech',
      symptoms: [{ region: 'Kopf', measurementType: 'pain', measurementValue: 6, duration: 'days' }],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ modelStrategy: 'fallback-only' }),
    )
    expect(requestStructuredAiResponseMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ modelStrategy: 'fallback-only' }),
    )
  })

  it('uebernimmt nicht abgedeckte KI-Symptome als Freitext-Symptom', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Blutiger Auswurf', measurementType: 'severity' }],
      })

    const result = await extractSymptoms('Ich habe blutigen Auswurf.')

    expect(result.symptoms).toEqual([{ region: 'Blutiger Auswurf', measurementType: 'severity' }])
  })

  it('uebernimmt relevante Zusatzdetails auch bei Mapping auf vorhandene Symptome', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [
          {
            region: 'Verbrennung',
            details: 'Kochendes Wasser ueber Arm geschuettet',
            measurementType: 'severity',
          },
        ],
      })

    const result = await extractSymptoms('Ich habe kochendes Wasser über meinen Arm geschüttet.')

    expect(result.symptoms).toEqual([
      {
        region: 'Verbrennung',
        details: 'Kochendes Wasser ueber Arm geschuettet',
        measurementType: 'severity',
      },
    ])
  })

  it('bewahrt Negationen in Zusatzdetails fuer die Triage', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinischer Verletzungskontext erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [
          {
            region: 'In Nagel getreten',
            side: 'Fuß',
            details: 'Nagel steckt nicht im Fuß',
            measurementType: 'severity',
          },
        ],
      })

    const result = await extractSymptoms('Der Nagel steckt aber nicht in meinem Fuß.')

    expect(result.symptoms).toEqual([
      {
        region: 'In Nagel getreten',
        side: 'Fuß',
        details: 'Nagel steckt nicht im Fuß',
        measurementType: 'severity',
      },
    ])
  })

  it('laesst Verletzungsereignisse als Freitext-Symptom durch die Extraktion laufen', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinischer Verletzungskontext erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'In Nagel getreten', measurementType: 'severity' }],
      })

    const result = await extractSymptoms('Ich bin in einen Nagel getreten.')

    expect(result.symptoms).toEqual([{ region: 'In Nagel getreten', measurementType: 'severity' }])
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
  })

  it('laesst Koerperteilverlust als Freitext-Symptom durch die Extraktion laufen', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinischer Verletzungskontext erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Amputierter Arm', measurementType: 'severity' }],
      })

    const result = await extractSymptoms('Ich habe meinen Arm verloren.')

    expect(result.symptoms).toEqual([{ region: 'Amputierter Arm', measurementType: 'severity' }])
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
  })

  it('uebernimmt Messwerte aus der KI-Extraktion ohne lokale Nachfilterung', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Blutiges Erbrechen', measurementType: 'severity', measurementValue: 10 }],
      })

    const result = await extractSymptoms('Ich habe mich uebergeben und es kam auch Blut mit hoch.')

    expect(result.symptoms).toEqual([{ region: 'Blutiges Erbrechen', measurementType: 'severity', measurementValue: 10 }])
  })

  it('versucht die Extraktion, wenn nur die Validierungs-KI ausfaellt', async () => {
    requestStructuredAiResponseMock
      .mockRejectedValueOnce(new AiResponseError('validation timeout'))
      .mockResolvedValueOnce({
        symptoms: [{ region: 'Bauch', measurementType: 'pain', measurementValue: 4 }],
      })

    const result = await extractSymptoms('Ich habe Bauchschmerzen.')

    expect(result).toEqual({
      text: 'Ich habe Bauchschmerzen.',
      inputType: 'text',
      symptoms: [{ region: 'Bauch', measurementType: 'pain', measurementValue: 4 }],
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(2)
  })

  it('liefert einen kontrollierten Fallback, wenn die Extraktion ausfaellt', async () => {
    requestStructuredAiResponseMock
      .mockResolvedValueOnce({
        isValidMedicalInput: true,
        reason: 'Medizinische Beschwerde erkannt.',
      })
      .mockRejectedValueOnce(new AiResponseError('extraction timeout'))

    const result = await extractSymptoms('Ich habe starke Rueckenschmerzen.')

    expect(result).toMatchObject({
      text: 'Ich habe starke Rueckenschmerzen.',
      inputType: 'text',
      symptoms: [],
      aiUnavailable: true,
    })
    expect(result.message).toContain('KI-Auswertung')
  })

  it('reicht unerwartete Fehler weiter', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new Error('boom'))

    await expect(extractSymptoms('Ich habe seit Tagen Husten.')).rejects.toThrow('boom')
  })
})

describe('validateSymptomInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validiert medizinischen Kontext ohne Extraktionsaufruf', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: true,
      reason: 'Medizinischer Kontext erkannt.',
    })

    const result = await validateSymptomInput('Verbrennung, kochendes Wasser ueber Arm geschuettet')

    expect(result).toEqual({
      text: 'Verbrennung, kochendes Wasser ueber Arm geschuettet',
      inputType: 'text',
      isValidMedicalInput: true,
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'symptom_input_validation_result',
        modelStrategy: 'fallback-only',
      }),
    )
  })

  it('meldet themenfremde Eingaben als ungueltig', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: false,
      reason: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })

    const result = await validateSymptomInput('Ich mag Pizza und Filme.')

    expect(result).toEqual({
      text: 'Ich mag Pizza und Filme.',
      inputType: 'text',
      isValidMedicalInput: false,
      message: 'Der Text beschreibt keine gesundheitlichen Beschwerden.',
    })
  })

  it('faengt wiederholte Platzhaltertexte wie BlaBla ohne KI-Aufruf ab', async () => {
    const result = await validateSymptomInput('BlaBla, BlaBla')

    expect(result).toMatchObject({
      text: 'BlaBla, BlaBla',
      inputType: 'text',
      isValidMedicalInput: false,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  it('faengt Platzhaltertexte im Symptomnamen ohne KI-Aufruf ab', async () => {
    const result = await validateSymptomInput('BlaBla')

    expect(result).toMatchObject({
      text: 'BlaBla',
      inputType: 'text',
      isValidMedicalInput: false,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })
})
