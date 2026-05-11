import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { z } from 'zod'
import {process} from "zod/v4/core";

const app = Fastify({ logger: true })

await app.register(helmet)
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
})

// Zod Schema Test
const PingSchema = z.object({
  message: z.string().min(1),
})

// Routes
app.get('/health', async () => ({ status: 'ok' }))

app.post('/ping', async (request, reply) => {
  const result = PingSchema.safeParse(request.body)
  if (!result.success) {
    return reply.status(400).send({ errors: result.error.flatten() })
  }
  return { pong: result.data.message }
})

// Start
try {
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}