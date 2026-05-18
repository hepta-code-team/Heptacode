import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { pdfRoutes } from './routes/pdf.routes.js'
import { symptomExtractionRoutes } from './routes/symptomExtraction.routes.js'
import { triageRoutes } from './routes/triage.routes.js'
import { summaryRoutes } from './api/summary/summary.routes.js'

interface HttpError {
  statusCode?: number
  message?: string
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true })

  await app.register(helmet)
  await app.register(cors, { origin: env.corsOrigin })

  app.addHook('onRequest', async (request) => {
    request.log.debug({ method: request.method, url: request.url }, 'incoming request')
  })

  app.setErrorHandler((error: HttpError, _request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        message: 'Validation failed',
        details: error.flatten(),
      })
      return
    }

    const statusCode = error.statusCode ?? 500
    void reply.status(statusCode).send({
      message: error.message ?? 'Internal Server Error',
    })
  })

   app.get('/health', async () => ({ status: 'ok' }))

  await app.register(symptomExtractionRoutes)
  await app.register(triageRoutes)
  await app.register(pdfRoutes)
  await app.register(summaryRoutes, { prefix: '/api/v1' })

  return app
}