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

/** Replaces the OpenAI-compatible client with controllable structured and JSON mocks. */
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

  /** Structured parsing should return the parsed payload from the primary model. */
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

  /** Missing temperature should fall back to the adapter default. */
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

  /** Fallback-only strategy should skip the primary model and use fallback timeout settings. */
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

  /** Non-availability structured parsing failures should retry through JSON mode. */
  it('nutzt JSON-Fallback, wenn Structured Parsing ohne Availability-Fehler fehlschlaegt', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockRejectedValueOnce(new Error('parse unsupported'))
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: 'json ok' }),
          },
        },
      ],
    })

    const result = await requestStructuredAiResponse({
      messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
      schema: z.object({ result: z.string() }),
      schemaName: 'test_schema',
      temperature: 0,
    })

    expect(result).toEqual({ result: 'json ok' })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: 'Antworte ausschliesslich mit validem JSON.',
          }),
        ]),
      }),
      AI_REQUEST_OPTIONS,
    )
  })

  /** JSON fallback should fail loudly when the model returns no textual content. */
  it('wirft AiResponseError, wenn der JSON-Fallback keinen Content liefert', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockRejectedValueOnce(new Error('parse unsupported'))
    createMock.mockResolvedValueOnce({
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
        modelStrategy: 'fallback-only',
      }),
    ).rejects.toThrow('AI returned no JSON content for test_schema')
  })

  /** JSON fallback should fail loudly when the model returns malformed JSON. */
  it('wirft AiResponseError, wenn der JSON-Fallback invalides JSON liefert', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockRejectedValueOnce(new Error('parse unsupported'))
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '{invalid-json',
          },
        },
      ],
    })

    await expect(
      requestStructuredAiResponse({
        messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
        schema: z.object({ result: z.string() }),
        schemaName: 'test_schema',
        modelStrategy: 'fallback-only',
      }),
    ).rejects.toThrow('AI returned invalid JSON for test_schema')
  })

  /** JSON fallback should still enforce the requested schema. */
  it('wirft AiResponseError, wenn JSON nicht zum Schema passt', async () => {
    const { requestStructuredAiResponse } = await import('../../../src/ai/llmAdapter.js')

    parseMock.mockRejectedValueOnce(new Error('parse unsupported'))
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ result: 123 }),
          },
        },
      ],
    })

    await expect(
      requestStructuredAiResponse({
        messages: [{ role: 'user', content: 'Bitte strukturiert antworten.' }],
        schema: z.object({ result: z.string() }),
        schemaName: 'test_schema',
        modelStrategy: 'fallback-only',
      }),
    ).rejects.toThrow('AI returned JSON that does not match test_schema')
  })

  /** Default strategy should try the fallback model after primary structured and JSON failures. */
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

  /** Responses without parsed content should be treated as AI response failures. */
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
