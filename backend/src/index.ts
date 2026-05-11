import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { z } from "zod";
import { medgemma } from "./ai/client.js";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
});

const PingSchema = z.object({
  message: z.string().min(1),
});

const AiTestSchema = z.object({
  message: z.string().min(1),
  model: z.string().min(1).optional(),
});

app.get("/health", async () => ({ status: "ok" }));

app.post("/ping", async (request, reply) => {
  const result = PingSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ errors: result.error.flatten() });
  }

  return { pong: result.data.message };
});

app.post("/ai/test", async (request, reply) => {
  const result = AiTestSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ errors: result.error.flatten() });
  }

  if (!process.env.Base_URL) {
    return reply.status(500).send({ error: "Base_URL ist nicht gesetzt." });
  }

  try {
    const completion = await medgemma.chat.completions.create({
      model: result.data.model ?? process.env.MODEL_NAME ?? "medgemma",
      messages: [
        {
          role: "system",
          content: "Antworte kurz, medizinisch vorsichtig und laienverstaendlich.",
        },
        {
          role: "user",
          content: result.data.message,
        },
      ],
      temperature: 0.2,
    });

    return {
      model: completion.model,
      answer: completion.choices[0]?.message?.content ?? "",
      raw: completion,
    };
  } catch (error) {
    request.log.error(error);
    const message = error instanceof Error ? error.message : "Unbekannter KI-Fehler";
    return reply.status(502).send({ error: message });
  }
});

try {
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
