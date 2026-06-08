import { zodResponseFormat } from 'openai/helpers/zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { z } from 'zod'
import { aiClient, aiModel, fallbackModel } from './client.js'
import {
  AI_REQUEST_TIMEOUT_MS,
  AiResponseError,
  createAiRequestOptions,
  isAiAvailabilityError,
  isAiRequestError,
} from './timeout.js'

type StructuredAiRequest<TSchema extends z.ZodTypeAny> = {
  messages: ChatCompletionMessageParam[]
  schema: TSchema
  schemaName: string
  temperature?: number
  modelStrategy?: 'primary-with-fallback' | 'fallback-only'
}

type StructuredAiResponse<TSchema extends z.ZodTypeAny> = {
  data: z.infer<TSchema>
  model: string
}

type ModelRequest<TSchema extends z.ZodTypeAny> = Required<Omit<
  StructuredAiRequest<TSchema>,
  'modelStrategy'
>>


/**
 * Requests one model and validates the response against the expected schema.
 *
 * The preferred parse endpoint is tried first; if parsing itself fails for a
 * non-availability reason, the adapter falls back to plain JSON mode and local
 * Zod validation so callers still receive the same typed contract.
 */
function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }

  return undefined
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runLoggedAiCall<T>(
  meta: {
    model: string
    schemaName: string
    mode: 'structured' | 'json'
    timeoutMs: number
  },
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()

  console.info('AI request started', meta)

  try {
    const result = await run()

    console.info('AI request succeeded', {
      ...meta,
      durationMs: Date.now() - startedAt,
    })

    return result
  } catch (error) {
    console.warn('AI request failed', {
      ...meta,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: getErrorMessage(error),
      status: getErrorStatus(error),
    })

    throw error
  }
}

async function requestWithModel<TSchema extends z.ZodTypeAny>(
  model: string,
  {
    messages,
    schema,
    schemaName,
    temperature,
  }: ModelRequest<TSchema>,
  timeoutMs: number,
): Promise<z.infer<TSchema>> {
  try {
    const completion = await runLoggedAiCall(
      {
        model,
        schemaName,
        mode: 'structured',
        timeoutMs,
      },
      () =>
        aiClient.beta.chat.completions.parse(
          {
            model,
            messages,
            response_format: zodResponseFormat(schema, schemaName),
            temperature,
          },
          createAiRequestOptions(timeoutMs),
        ),
    )

    const parsed = completion.choices[0]?.message.parsed

    if (!parsed) {
      throw new AiResponseError(`AI returned no structured result for ${schemaName}`)
    }

    return parsed
  } catch (parseError) {
    if (isAiAvailabilityError(parseError)) {
      throw parseError
    }

    const completion = await runLoggedAiCall(
      {
        model,
        schemaName,
        mode: 'json',
        timeoutMs,
      },
      () =>
        aiClient.chat.completions.create(
          {
            model,
            messages: [
              ...messages,
              {
                role: 'system',
                content: 'Antworte ausschliesslich mit validem JSON.',
              },
            ],
            response_format: { type: 'json_object' },
            temperature,
          },
          createAiRequestOptions(timeoutMs),
        ),
    )

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new AiResponseError(`AI returned no JSON content for ${schemaName}`)
    }

    let parsedJson: unknown

    try {
      parsedJson = JSON.parse(content)
    } catch {
      throw new AiResponseError(`AI returned invalid JSON for ${schemaName}`)
    }

    const validated = schema.safeParse(parsedJson)

    if (!validated.success) {
      throw new AiResponseError(`AI returned JSON that does not match ${schemaName}`)
    }

    return validated.data
  }
}

// Requests a structured AI response and validates it against the provided Zod schema.
export async function requestStructuredAiResponse<TSchema extends z.ZodTypeAny>({
  messages,
  schema,
  schemaName,
  temperature = 0.2,
  modelStrategy,
}: StructuredAiRequest<TSchema>): Promise<z.infer<TSchema>> {
  const response = await requestStructuredAiResponseWithModel({
    messages,
    schema,
    schemaName,
    temperature,
    modelStrategy,
  })

  return response.data
}

/**
 * Requests structured output and records which model produced it.
 *
 * Services use the model name for transparency in the frontend, and they can
 * force fallback-only mode for cheaper validation-style AI checks.
 */
export async function requestStructuredAiResponseWithModel<TSchema extends z.ZodTypeAny>({
  messages,
  schema,
  schemaName,
  temperature = 0.2,
  modelStrategy = 'primary-with-fallback',
}: StructuredAiRequest<TSchema>): Promise<StructuredAiResponse<TSchema>> {
  const request = {
    messages,
    schema,
    schemaName,
    temperature,
  }

  if (modelStrategy === 'fallback-only') {
    return {
      data: await requestWithModel(fallbackModel, request, AI_REQUEST_TIMEOUT_MS.fallback),
      model: fallbackModel,
    }
  }

  try {
    return {
      data: await requestWithModel(aiModel, request, AI_REQUEST_TIMEOUT_MS.primary),
      model: aiModel,
    }
  } catch (error) {
    if (fallbackModel === aiModel || !isAiRequestError(error)) {
      throw error
    }

    return {
      data: await requestWithModel(fallbackModel, request, AI_REQUEST_TIMEOUT_MS.fallback),
      model: fallbackModel,
    }
  }
}
