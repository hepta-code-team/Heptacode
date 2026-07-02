import type { FastifyPluginAsync } from 'fastify'
import { evaluateTriage } from '../modules/triage/triage.service.js'
import { validateRequest } from '../common/middleware/validateRequest.js'
import { triageRequestSchema } from '../modules/triage/triage.types.js'

export const triageRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/v1/triage/evaluate',
    {
      preHandler: validateRequest({
        body: triageRequestSchema,
      }),
    },
    async (request, reply) => {
      const body = request.body as any

      const result = await evaluateTriage(
        body.patientData,
        body.symptoms,
        body.emergencyFromLanding,
        body.text,
        body.inputType,
      )

      return reply.send(result)
    },
  )
}