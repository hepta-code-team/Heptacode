import type { FastifyReply, FastifyRequest } from 'fastify'
import { createSummaryService } from './summary.service.js'
import { SummaryRequestSchema } from './summary.types.js'

export async function createSummaryController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = SummaryRequestSchema.safeParse(request.body)

  if (!result.success) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Die übergebenen Daten sind ungültig.',
        details: result.error.flatten(),
      },
    })
  }

  try {
    const summary = await createSummaryService(result.data)

    return reply.status(200).send(summary)
  } catch (error) {
    if (error instanceof Error && error.message === 'CONSENT_REQUIRED') {
      return reply.status(422).send({
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'Die Zustimmung zur Datenverarbeitung ist erforderlich.',
        },
      })
    }

    request.log.error(error)

    return reply.status(500).send({
      error: {
        code: 'SUMMARY_CREATION_FAILED',
        message: 'Die Zusammenfassung konnte nicht erstellt werden.',
      },
    })
  }
}