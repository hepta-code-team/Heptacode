import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EnvConfig {
  port: number
  host: string
  corsOrigin: string
  aiApiUrl: string
  aiApiKey: string
  /** Model identifier for the external AI system used in symptom extraction. */
  aiModel: string
  /** Model identifier used when the primary AI model is unavailable or times out. */
  fallbackModel: string
  googleMapsApiKey?: string
  /** Target FHIR server endpoint used for outgoing Bundle POSTs. */
  fhirEndpoint?: string
  /** Optional bearer token for the target FHIR server. */
  fhirAuthToken?: string
  /** Timeout for outgoing FHIR HTTP requests. */
  fhirRequestTimeoutMs: number
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) {
    return
  }

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim()

    process.env[key] ??= value
  }
}

function loadLocalEnvFiles(): void {
  const cwd = process.cwd()
  const candidates = [
    join(cwd, '.env.local'),
    join(cwd, '.env'),
    join(cwd, '..', '.env.local'),
    join(cwd, '..', '.env'),
  ]

  for (const candidate of candidates) {
    loadEnvFile(candidate)
  }
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

function readOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readTimeoutMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

loadLocalEnvFiles()

export const env: EnvConfig = {
  port: readPort(process.env.PORT),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  aiApiUrl: readRequired(process.env.AI_API_URL, 'AI_API_URL'),
  aiApiKey: process.env.AI_API_KEY ?? 'dummy',
  aiModel: process.env.AI_MODEL ?? 'medgemma:27b',
  fallbackModel: process.env.FALLBACK_MODEL ?? 'medgemma:4b',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  fhirEndpoint: readOptional(process.env.FHIR_ENDPOINT),
  fhirAuthToken: readOptional(process.env.FHIR_AUTH_TOKEN),
  fhirRequestTimeoutMs: readTimeoutMs(process.env.FHIR_REQUEST_TIMEOUT_MS, 10_000),
}
