import type { FastifyPluginAsync } from 'fastify'
import { env } from '../config/env.js'
import {
  fhirSendRequestSchema,
  sendFhirBundle,
} from '../modules/fhir/fhirSend.service.js'

/**
 * Registers FHIR-facing endpoints.
 *
 * The send endpoint is the HTTP boundary for FHIR transmission. It validates
 * the incoming Bundle shape and then delegates to the configured send service:
 * dummy acknowledgement locally or real HTTP POST to a FHIR endpoint.
 */
export const fhirRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/fhir/send', async (request, reply) => {
    const body = fhirSendRequestSchema.parse(request.body)
    const result = await sendFhirBundle(
      {
        target: body.target,
        bundle: body.bundle as fhir4.Bundle,
      },
      {
        mode: env.fhirSendMode,
        endpoint: env.fhirEndpoint,
        authToken: env.fhirAuthToken,
        timeoutMs: env.fhirRequestTimeoutMs,
      },
    )

    // Keep logs content-light; the Bundle may contain sensitive medical data.
    request.log.info(
      {
        fhirSend: {
          mode: result.mode,
          status: result.status,
          target: result.target,
          transmissionId: result.transmissionId,
          submittedAt: result.submittedAt,
          bundleSummary: result.bundleSummary,
          response: result.response,
          error: result.error,
        },
      },
      result.status === 'accepted' ? 'FHIR send accepted' : 'FHIR send failed',
    )

    return reply.code(result.status === 'accepted' ? 202 : 502).send(result)
  })
}
