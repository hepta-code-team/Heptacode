import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  AI_REQUEST_OPTIONS,
  AI_REQUEST_TIMEOUT_MS,
  AiResponseError,
  createAiRequestOptions,
} from '../../../src/ai/timeout.js'

const parseMock = vi.fn()
const createMock = vi.fn()

vi.mock('../../../src/ai/client.js', () => ({
  aiClient: {
    beta: {
      chat: {
        completions: {
          parse: parseMock,
        },
      },
    },
    chat: {
      completions: {
        create: createMock,
      },
    },
  },
  aiModel: 'test-model',
  fallbackModel: 'fallback-test-model',
}))

describe('requestStructuredAiResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt die strukturierte parsed-Antwort zurueck', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')
    const schema = z.object({
      result: z.string(),
    })

    parseMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: { result: 'ok' },
          },
        },
      ],
    })

    const result = await requestStructuredAiResponse({
      messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
      schema,
      schemaName: 'test_schema',
      temperature: 0,
    })

    expect(result).toEqual({ result: 'ok' })
    expect(parseMock).toHaveBeenCalledTimes(1)
    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
        temperature: 0,
      }),
      AI_REQUEST_OPTIONS,
    )
  })

  it('nutzt die Standard-Temperatur, wenn keine Temperatur uebergeben wird', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: { result: 'ok' },
          },
        },
      ],
    })

    await requestStructuredAiResponse({
      messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
      schema: z.object({ result: z.string() }),
      schemaName: 'test_schema',
    })

    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.2,
      }),
      AI_REQUEST_OPTIONS,
    )
  })

  it('nutzt bei fallback-only direkt das Fallback-Modell', async () => {
    const { requestStructuredAiResponseWithModel } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: { result: 'ok' },
          },
        },
      ],
    })

    const result = await requestStructuredAiResponseWithModel({
      messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
      schema: z.object({ result: z.string() }),
      schemaName: 'test_schema',
      modelStrategy: 'fallback-only',
    })

    expect(result).toEqual({ data: { result: 'ok' }, model: 'fallback-test-model' })
    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'fallback-test-model',
      }),
      createAiRequestOptions(AI_REQUEST_TIMEOUT_MS.fallback),
    )
  })

  it('versucht bei der Standardstrategie nach einem Fehler das Fallback-Modell', async () => {
    const { requestStructuredAiResponseWithModel } = await import('../../../src/ai/llmAdapter.js')

    parseMock
      .mockRejectedValueOnce(new AiResponseError('primary failed'))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: { result: 'fallback ok' },
            },
          },
        ],
      })
    createMock.mockRejectedValueOnce(new AiResponseError('primary json failed'))

    const result = await requestStructuredAiResponseWithModel({
      messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
      schema: z.object({ result: z.string() }),
      schemaName: 'test_schema',
    })

    expect(result).toEqual({ data: { result: 'fallback ok' }, model: 'fallback-test-model' })
    expect(parseMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: 'test-model' }),
      AI_REQUEST_OPTIONS,
    )
    expect(parseMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ model: 'fallback-test-model' }),
      createAiRequestOptions(AI_REQUEST_TIMEOUT_MS.fallback),
    )
  })

  it('wirft AiResponseError, wenn keine parsed-Antwort vorhanden ist', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {},
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {},
          },
        ],
      })
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {},
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {},
          },
        ],
      })

    await expect(
      requestStructuredAiResponse({
        messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
        schema: z.object({ result: z.string() }),
        schemaName: 'test_schema',
      }),
    ).rejects.toThrow(AiResponseError)
  })
})
