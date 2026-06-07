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
    const completion = await aiClient.beta.chat.completions.parse(
      {
        model,
        messages,
        response_format: zodResponseFormat(schema, schemaName),
        temperature,
      },
      createAiRequestOptions(timeoutMs),
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

    const completion = await aiClient.chat.completions.create(
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

// Funktion um strukturierte Antworten von der KI zu erhalten, basierend auf einem bereitgestellten Zod-Schema.
export async function requestStructuredAiResponse<TSchema extends z.ZodTypeAny>({
  messages,
  schema,
  schemaName,
  temperature = 0.2,
}: StructuredAiRequest<TSchema>): Promise<z.infer<TSchema>> {
  const response = await requestStructuredAiResponseWithModel({
    messages,
    schema,
    schemaName,
    temperature,
  })

  return response.data
}

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
