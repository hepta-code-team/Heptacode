import { zodResponseFormat } from 'openai/helpers/zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { z } from 'zod'
import { aiClient, aiModel } from './client.js'

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
  const completion = await aiClient.beta.chat.completions.parse({
    model: aiModel,
    messages,
    response_format: zodResponseFormat(schema, schemaName),
    temperature,
  })

  const parsed = completion.choices[0]?.message.parsed

  if (!parsed) {
    throw new Error(`AI returned no structured result for ${schemaName}`)
  }

  return parsed
}
