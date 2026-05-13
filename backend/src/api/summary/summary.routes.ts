import type { FastifyInstance } from 'fastify'
import {
  createSummaryController,
  downloadSummaryPdfController,
} from './summary.controller.js'

export async function summaryRoutes(app: FastifyInstance) {
  app.post('/summary', createSummaryController)
  app.get('/summary/pdf', downloadSummaryPdfController)
}