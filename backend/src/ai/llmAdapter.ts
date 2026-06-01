import { zodResponseFormat } from 'openai/helpers/zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { z } from 'zod'
import { aiClient, aiModel, fallbackModel } from './client.js'
import { AI_REQUEST_OPTIONS, AiResponseError, isAiAvailabilityError } from './timeout.js'

type StructuredAiRequest<TSchema extends z.ZodTypeAny> = {
  messages: ChatCompletionMessageParam[]
  schema: TSchema
  schemaName: string
  temperature?: number
}

type StructuredAiResponse<TSchema extends z.ZodTypeAny> = {
  data: z.infer<TSchema>
  model: string
}

async function requestWithModel<TSchema extends z.ZodTypeAny>(
  model: string,
  {
    messages,
    schema,
    schemaName,
    temperature,
  }: Required<StructuredAiRequest<TSchema>>,
): Promise<z.infer<TSchema>> {
  try {
    const completion = await aiClient.beta.chat.completions.parse(
      {
        model,
        messages,
        response_format: zodResponseFormat(schema, schemaName),
        temperature,
      },
      AI_REQUEST_OPTIONS,
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
        messages,
        response_format: { type: 'json_object' },
        temperature,
      },
      AI_REQUEST_OPTIONS,
    )

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw parseError
    }

    let parsedJson: unknown

    try {
      parsedJson = JSON.parse(content)
    } catch {
      throw parseError
    }

    const validated = schema.safeParse(parsedJson)

    if (!validated.success) {
      throw parseError
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
}: StructuredAiRequest<TSchema>): Promise<StructuredAiResponse<TSchema>> {
  const request = {
    messages,
    schema,
    schemaName,
    temperature,
  }

  try {
    return {
      data: await requestWithModel(aiModel, request),
      model: aiModel,
    }
  } catch (error) {
    if (fallbackModel === aiModel || !isAiAvailabilityError(error)) {
      throw error
    }

    return {
      data: await requestWithModel(fallbackModel, request),
      model: fallbackModel,
    }
  }
}
