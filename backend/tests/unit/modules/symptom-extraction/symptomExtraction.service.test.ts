import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../../../src/ai/llmAdapter.js'
import { AiResponseError } from '../../../../src/ai/timeout.js'
import {
  extractSymptoms,
  validateSymptomDetailInput,
  validateSymptomInput,
} from '../../../../src/modules/symptom-extraction/symptomExtraction.service.js'

vi.mock('../../../../src/ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

/** Shared patient fixture for demographic plausibility checks. */
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
    vi.resetAllMocks()
  })

  /** Too-short input should be rejected by local heuristics before any model call. */
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

  /** Punctuation and numeric placeholders should be rejected before model execution. */
  it('faengt reine Satzzeichen ohne KI-Aufruf ab', async () => {
    const result = await extractSymptoms('123 !!!')

    expect(result).toMatchObject({
      text: '123 !!!',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
    })
    expect(result.message).toContain('zusammen')
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  /** Demographic contradictions should stop extraction before model execution. */
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

  /** Medical-context validation should return invalid input without running extraction. */
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

  /** Validated medical text should continue into symptom extraction. */
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

  /** Unknown AI-extracted complaints should remain available as free-text symptoms. */
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

  /** Relevant injury details should survive mapping to a known symptom region. */
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

  /** Negated details should be preserved because they can change triage interpretation. */
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

  /** Injury events should remain extractable as free-text symptom entries. */
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

  /** Short single-word input should stay blocked by strict free-text validation. */
  it('behaelt die strenge Freitextvalidierung fuer kurze Einzelbegriffe bei', async () => {
    const result = await extractSymptoms('Fieber')

    expect(result).toMatchObject({
      text: 'Fieber',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  /** Severe free-text injury descriptions should not be dropped by taxonomy limits. */
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

  /** AI-provided measurement values should not be locally downgraded during extraction. */
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

  /** Extraction should still run when only the validation model path is unavailable. */
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

  /** Extraction availability failures should return the controlled aiUnavailable contract. */
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

  /** Unexpected model adapter errors should remain visible to callers. */
  it('reicht unerwartete Fehler weiter', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new Error('boom'))

    await expect(extractSymptoms('Ich habe seit Tagen Husten.')).rejects.toThrow('boom')
  })
})

describe('validateSymptomInput', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  /** Standalone validation should classify medical text without extraction. */
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

  /** Non-medical text should return a domain-level invalid result. */
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

  /** Repeated placeholder text should be rejected locally before model execution. */
  it('faengt wiederholte Platzhaltertexte wie BlaBla ohne KI-Aufruf ab', async () => {
    const result = await validateSymptomInput('BlaBla, BlaBla')

    expect(result).toMatchObject({
      text: 'BlaBla, BlaBla',
      inputType: 'text',
      isValidMedicalInput: false,
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  /** Validation availability failures should return the controlled aiUnavailable contract. */
  it('meldet kontrolliert, wenn die Validierungs-KI nicht verfuegbar ist', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('validation timeout'))

    const result = await validateSymptomInput('Ich habe seit Tagen Husten.')

    expect(result).toMatchObject({
      text: 'Ich habe seit Tagen Husten.',
      inputType: 'text',
      isValidMedicalInput: false,
      aiUnavailable: true,
    })
    expect(result.message).toContain('Kontext')
  })

  /** Unexpected validation errors should not be converted into domain-level invalid input. */
  it('reicht unerwartete Validierungsfehler weiter', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new Error('boom'))

    await expect(validateSymptomInput('Ich habe seit Tagen Husten.')).rejects.toThrow('boom')
  })

  /** Placeholder symptom names should be rejected locally before model execution. */
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

describe('validateSymptomDetailInput', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('validiert kurze Details ueber das lockere Fallback-Modell', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: true,
      reason: 'Kurzes medizinisches Detail erkannt.',
    })

    const result = await validateSymptomDetailInput('links')

    expect(result).toEqual({
      text: 'links',
      inputType: 'text',
      isValidMedicalInput: true,
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
    expect(requestStructuredAiResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'symptom_detail_validation_result',
        modelStrategy: 'fallback-only',
      }),
    )
  })

  it('laesst Zufallstext durch das Fallback-Modell ablehnen', async () => {
    requestStructuredAiResponseMock.mockResolvedValueOnce({
      isValidMedicalInput: false,
      reason: 'Die Angabe wirkt wie Buchstabensalat.',
    })

    const result = await validateSymptomDetailInput('fesijfbi')

    expect(result).toEqual({
      text: 'fesijfbi',
      inputType: 'text',
      isValidMedicalInput: false,
      message: 'Die Angabe wirkt wie Buchstabensalat.',
    })
    expect(requestStructuredAiResponseMock).toHaveBeenCalledTimes(1)
  })

  it('faengt leere Detailangaben ohne KI-Aufruf ab', async () => {
    const result = await validateSymptomDetailInput('   ')

    expect(result).toEqual({
      text: '   ',
      inputType: 'text',
      isValidMedicalInput: false,
      message: 'Bitte geben Sie eine Angabe ein.',
    })
    expect(requestStructuredAiResponseMock).not.toHaveBeenCalled()
  })

  /** Detail validation availability failures should return the controlled aiUnavailable contract. */
  it('meldet kontrolliert, wenn die Detail-Validierungs-KI nicht verfuegbar ist', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new AiResponseError('detail validation timeout'))

    const result = await validateSymptomDetailInput('links')

    expect(result).toMatchObject({
      text: 'links',
      inputType: 'text',
      isValidMedicalInput: false,
      aiUnavailable: true,
    })
    expect(result.message).toContain('Kontext')
  })

  /** Unexpected detail-validation errors should remain visible to callers. */
  it('reicht unerwartete Detail-Validierungsfehler weiter', async () => {
    requestStructuredAiResponseMock.mockRejectedValueOnce(new Error('boom'))

    await expect(validateSymptomDetailInput('links')).rejects.toThrow('boom')
  })
})
