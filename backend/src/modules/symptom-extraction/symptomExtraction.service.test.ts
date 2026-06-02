import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestStructuredAiResponse } from '../../ai/llmAdapter.js'
import { AiResponseError } from '../../ai/timeout.js'
import { extractSymptoms } from './symptomExtraction.service.js'

vi.mock('../../ai/llmAdapter.js', () => ({
  requestStructuredAiResponse: vi.fn(),
}))

const requestStructuredAiResponseMock = vi.mocked(requestStructuredAiResponse)

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

    const result = await extractSymptoms('Ich habe seit Tagen Kopfschmerzen.', 'speech')

    expect(result).toEqual({
      text: 'Ich habe seit Tagen Kopfschmerzen.',
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
