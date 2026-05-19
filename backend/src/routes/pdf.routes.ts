import type { FastifyPluginAsync } from 'fastify'
import { Buffer } from 'node:buffer'
import { createPdfSummary } from '../modules/pdf/pdfExport.service.js'
import { pdfExportRequestSchema } from '../modules/pdf/pdf.types.js'

export const pdfRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/pdf/export', async (request, reply) => {
    const body = pdfExportRequestSchema.parse(request.body)

    const pdf = createPdfSummary(body)

    return reply
      .header('Content-Type', pdf.mimeType)
      .header('Content-Disposition', `attachment; filename="${pdf.fileName}"`)
      .send(Buffer.from(pdf.contentBase64, 'base64'))
  })
}