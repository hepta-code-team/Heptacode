import { zodResponseFormat } from 'openai/helpers/zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { z } from 'zod'
import { aiClient, aiModel } from './client.js'
import { AI_REQUEST_OPTIONS, AiResponseError } from './timeout.js'

type StructuredAiRequest<TSchema extends z.ZodTypeAny> = {
  messages: ChatCompletionMessageParam[]
  schema: TSchema
  schemaName: string
  temperature?: number
}

// Funktion um strukturierte Antworten von der KI zu erhalten, basierend auf einem bereitgestellten Zod-Schema.
export async function requestStructuredAiResponse<TSchema extends z.ZodTypeAny>({
  messages,
  schema,
  schemaName,
  temperature = 0.2,
}: StructuredAiRequest<TSchema>): Promise<z.infer<TSchema>> {
  try {
    const completion = await aiClient.beta.chat.completions.parse(
      {
        model: aiModel,
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
    const completion = await aiClient.chat.completions.create(
      {
        model: aiModel,
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
