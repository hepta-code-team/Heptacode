import type { FastifyPluginAsync } from 'fastify'
import { extractSymptoms } from '../modules/symptom-extraction/symptomExtraction.service.js'
import { symptomExtractionRequestSchema } from '../modules/symptom-extraction/symptomExtraction.types.js'

export const symptomExtractionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/symptoms/extraction', async (request, reply) => {
    const body = symptomExtractionRequestSchema.parse(request.body)
    const result = await extractSymptoms(
      body.symptomText ?? body.text ?? body.input ?? '',
      body.inputType,
    )

    return reply.send(result)
  })
}
