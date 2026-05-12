import type { FastifyPluginAsync } from 'fastify'
import { evaluateTriage } from '../modules/triage/triage.service.js'
import { triageRequestSchema } from '../modules/triage/triage.types.js'

export const triageRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/triage/evaluate', async (request, reply) => {
    const body = triageRequestSchema.parse(request.body)
    void reply.send(evaluateTriage(body.assessment, body.emergencyFromLanding))
  })
}
