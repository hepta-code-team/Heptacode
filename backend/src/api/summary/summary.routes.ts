import type { FastifyInstance } from 'fastify'
import { createSummaryController } from './summary.controller.js'

export async function summaryRoutes(app: FastifyInstance) {
  app.post('/summary', createSummaryController)
}