import type { FastifyPluginAsync } from 'fastify'
import { env } from '../config/env.js'
import { evaluateAssessmentWithAi } from '../modules/assessment/assessment.service.js'
import { assessmentPayloadSchema } from '../modules/assessment/assessment.types.js'
import {
  buildFhirBundle,
  summarizeFhirBundleForLog,
} from '../modules/fhir/fhirBundle.js'
import { sendFhirBundle } from '../modules/fhir/fhirSend.service.js'

export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/assessments', async (request, reply) => {
    const parsedPayload = assessmentPayloadSchema.safeParse(request.body)

    if (!parsedPayload.success) {
      request.log.warn(
        {
          zodIssues: parsedPayload.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        },
        'Invalid assessment payload',
      )

      throw parsedPayload.error
    }

    const payload = parsedPayload.data
    const result = await evaluateAssessmentWithAi(payload)
    const fhirBundle = buildFhirBundle(payload, result)
    const fhirSendResult = await sendFhirBundle(
      {
        target: 'assessment-fhir-target',
        bundle: fhirBundle,
      },
      {
        endpoint: env.fhirEndpoint,
        authToken: env.fhirAuthToken,
        timeoutMs: env.fhirRequestTimeoutMs,
      },
    )

    request.log.info(
      { fhirBundle: summarizeFhirBundleForLog(fhirBundle) },
      'FHIR bundle generated for assessment',
    )
    request.log.info(
      { fhirSend: fhirSendResult },
      fhirSendResult.status === 'accepted'
        ? 'FHIR send accepted for assessment'
        : 'FHIR send failed for assessment',
    )

    void reply.send(result)
  })
}
