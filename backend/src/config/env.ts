export interface EnvConfig {
  port: number
  host: string
  corsOrigin: string
  aiApiUrl: string
  aiApiKey: string
  /** Model identifier for the external AI system used in symptom extraction. */
  aiModel: string
}

function readPort(value: string | undefined): number {
  const parsed = Number(value ?? '3000')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000
}

function readRequired(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is missing`)
  }
  return value
}

export const env: EnvConfig = {
  port: readPort(process.env.PORT),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  aiApiUrl: readRequired(process.env.AI_API_URL, 'AI_API_URL'),
  aiApiKey: process.env.AI_API_KEY ?? 'dummy',
  aiModel: process.env.AI_MODEL ?? 'medgemma',
}
