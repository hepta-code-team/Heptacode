import type { FastifyPluginAsync } from 'fastify'
import { extractSymptoms } from '../modules/symptom-extraction/symptomExtraction.service.js'
import { symptomExtractionRequestSchema } from '../modules/symptom-extraction/symptomExtraction.types.js'

export const symptomExtractionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/symptoms/extraction', async (request, reply) => {
    const body = symptomExtractionRequestSchema.parse(request.body)
    const input = body.input ?? body.text

    if (!input) {
      void reply.status(400).send({ message: 'text is required' })
      return
    }

    const result = await extractSymptoms(input, body.inputType)
    void reply.send(result)
  })
}
