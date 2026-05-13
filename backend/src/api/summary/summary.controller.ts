import { getSummaryById } from './summary.service'
import { createSummaryPdfBuffer } from './summary.pdf.service'
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
export async function downloadSummaryPdfController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = request.query as { summaryId?: string }

  if (!query.summaryId) {
    return reply.status(400).send({
      error: {
        code: 'SUMMARY_ID_REQUIRED',
        message: 'Die summaryId ist erforderlich.',
      },
    })
  }

  const summary = getSummaryById(query.summaryId)

  if (!summary) {
    return reply.status(404).send({
      error: {
        code: 'SUMMARY_NOT_FOUND',
        message: 'Für die angegebene summaryId wurde keine Summary gefunden.',
      },
    })
  }

  try {
    const pdfBuffer = await createSummaryPdfBuffer(summary)

    return reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="${summary.summaryId}.pdf"`
      )
      .send(pdfBuffer)
  } catch (error) {
    request.log.error(error)

    return reply.status(500).send({
      error: {
        code: 'PDF_CREATION_FAILED',
        message: 'Das PDF konnte nicht erstellt werden.',
      },
    })
  }
}