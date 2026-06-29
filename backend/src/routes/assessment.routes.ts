import type { FastifyPluginAsync } from 'fastify'
import { evaluateAssessmentWithAi } from '../modules/assessment/assessment.service.js'
import { assessmentPayloadSchema } from '../modules/assessment/assessment.types.js'
import {
  buildFhirBundle,
  formatFhirBundleForDebugLog,
  summarizeFhirBundleForLog,
} from '../modules/fhir/fhirBundle.js'

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

    request.log.info(
      { fhirBundle: summarizeFhirBundleForLog(fhirBundle) },
      'FHIR bundle generated for assessment',
    )
    console.info(formatFhirBundleForDebugLog(fhirBundle))

    void reply.send(result)
  })
}
