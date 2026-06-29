import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyInstance } from 'fastify'
import { env } from './config/env.js'
import { pdfRoutes } from './routes/pdf.routes.js'
import { symptomExtractionRoutes } from './routes/symptomExtraction.routes.js'
import { triageRoutes } from './routes/triage.routes.js'
import { assessmentRoutes } from './routes/assessment.routes.js'
import { placesRoutes } from './routes/places.routes.js'
import { errorHandler } from './common/middleware/errorHandler.js'
import { notFoundHandler } from './common/middleware/notFoundHandler.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true })

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin })

  app.addHook('onRequest', async (request) => {
    request.log.debug({ method: request.method, url: request.url }, 'incoming request')
  })

  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(assessmentRoutes)
  await app.register(symptomExtractionRoutes)
  await app.register(triageRoutes)
  await app.register(pdfRoutes)
  await app.register(placesRoutes)

  return app
}
