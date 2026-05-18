import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import { z, ZodError } from 'zod'
import { env } from './config/env.js'
import { summaryRoutes } from './api/summary/summary.routes.js'
import { assessmentRoutes } from './routes/assessment.routes.js'

const app = Fastify({ logger: true })

interface HttpError {
  statusCode?: number
  message?: string
}

const pingSchema = z.object({
  message: z.string().min(1),
})

await app.register(helmet)
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
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

app.post('/ping', async (request) => {
  const body = pingSchema.parse(request.body)

  return { pong: body.message }
})

await app.register(assessmentRoutes)
await app.register(summaryRoutes, { prefix: '/api/v1' })

try {
  await app.listen({ port: env.port, host: env.host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}