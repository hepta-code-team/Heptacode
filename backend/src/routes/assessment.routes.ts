import type { FastifyPluginAsync } from 'fastify'
import { evaluateAssessmentWithAi } from '../modules/assessment/assessment.service.js'
import { assessmentPayloadSchema } from '../modules/assessment/assessment.types.js'

export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/assessments', async (request, reply) => {
    const payload = assessmentPayloadSchema.parse(request.body)
    const result = await evaluateAssessmentWithAi(payload)

    void reply.send(result)
  })
}