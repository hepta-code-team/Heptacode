export interface EnvConfig {
  port: number
  host: string
  corsOrigin: string
  aiApiUrl?: string
  aiApiKey: string
}

function readPort(value: string | undefined): number {
  const parsed = Number(value ?? '3000')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000
}

export const env: EnvConfig = {
  port: readPort(process.env.PORT),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  aiApiUrl: process.env.AI_API_URL ?? process.env.Base_URL,
  aiApiKey: process.env.AI_API_KEY ?? 'dummy',
}
