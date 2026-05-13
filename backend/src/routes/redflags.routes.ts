import type { FastifyPluginAsync } from 'fastify'
import { checkRedFlags } from '../modules/redflags/redflag.service.js'
import { redFlagCheckRequestSchema } from '../modules/redflags/redflag.types.js'

export const redflagsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/triage/redflags', async (request, reply) => {
    const body = redFlagCheckRequestSchema.parse(request.body)
    void reply.send(checkRedFlags(body.text))
  })
}
