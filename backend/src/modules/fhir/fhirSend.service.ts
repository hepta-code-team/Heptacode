/// <reference types="fhir" />

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  summarizeFhirBundleForLog,
  type FhirBundleLogSummary,
} from './fhirBundle.js'

// The sender accepts only the generic Bundle envelope here. Profile-specific
// validation still belongs to the concrete target integration.
const fhirBundleEntrySchema = z
  .object({
    fullUrl: z.string().min(1).optional(),
    resource: z
      .object({
        resourceType: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough()

const fhirBundleForSendSchema = z
  .object({
    resourceType: z.literal('Bundle'),
    type: z.string().min(1),
    entry: z.array(fhirBundleEntrySchema).min(1),
  })
  .passthrough()

export const fhirSendRequestSchema = z.object({
  target: z.string().trim().min(1).max(200).optional(),
  bundle: fhirBundleForSendSchema,
})

export type FhirSendRequestBody = z.infer<typeof fhirSendRequestSchema>

export interface FhirSendInput {
  target?: string
  bundle: fhir4.Bundle
}

export interface FhirSendConfig {
  mode: 'dummy' | 'http'
  endpoint?: string
  authToken?: string
  timeoutMs: number
}

export interface FhirHttpResponseSummary {
  httpStatus?: number
  contentType?: string
  resourceType?: string
  issueCount?: number
  issueSeverities?: string[]
  issueCodes?: string[]
}

export interface FhirSendResult {
  mode: FhirSendConfig['mode']
  status: 'accepted' | 'failed'
  target: string
  transmissionId: string
  submittedAt: string
  bundleSummary: FhirBundleLogSummary
  response?: FhirHttpResponseSummary
  error?: string
}

const DEFAULT_DUMMY_TARGET = 'dummy-fhir-server'

function createBaseSendResult(
  request: FhirSendInput,
  mode: FhirSendConfig['mode'],
  target: string,
): Omit<FhirSendResult, 'status'> {
  return {
    mode,
    target,
    transmissionId: `${mode}-fhir-${randomUUID()}`,
    submittedAt: new Date().toISOString(),
    bundleSummary: summarizeFhirBundleForLog(request.bundle),
  }
}

/**
 * Simulates handing a FHIR Bundle to an external target system.
 *
 * This function intentionally performs no network IO and returns only
 * structure metadata, so it can be used for demos and integration tests without
 * exposing clinical content in the acknowledgement.
 */
export function simulateFhirBundleSend(request: FhirSendInput): FhirSendResult {
  return {
    ...createBaseSendResult(request, 'dummy', request.target ?? DEFAULT_DUMMY_TARGET),
    status: 'accepted',
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown FHIR send error'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStringArray(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string')
}

function summarizeOperationOutcome(body: Record<string, unknown>): FhirHttpResponseSummary {
  const issues = Array.isArray(body.issue) ? body.issue.filter(isRecord) : []

  return {
    resourceType: 'OperationOutcome',
    issueCount: issues.length,
    issueSeverities: readStringArray(issues.map((issue) => issue.severity)),
    issueCodes: readStringArray(issues.map((issue) => issue.code)),
  }
}

async function summarizeFhirHttpResponse(response: Response): Promise<FhirHttpResponseSummary> {
  const contentType = response.headers.get('content-type') ?? undefined
  const summary: FhirHttpResponseSummary = {
    httpStatus: response.status,
    ...(contentType ? { contentType } : {}),
  }

  if (!contentType?.toLowerCase().includes('json')) {
    return summary
  }

  try {
    const body = await response.json()

    if (!isRecord(body) || typeof body.resourceType !== 'string') {
      return summary
    }

    if (body.resourceType === 'OperationOutcome') {
      return {
        ...summary,
        ...summarizeOperationOutcome(body),
      }
    }

    return {
      ...summary,
      resourceType: body.resourceType,
    }
  } catch {
    return summary
  }
}

async function postFhirBundleOverHttp(
  request: FhirSendInput,
  config: FhirSendConfig,
): Promise<FhirSendResult> {
  const endpoint = config.endpoint?.trim()
  const base = createBaseSendResult(request, 'http', request.target ?? endpoint ?? 'missing-fhir-endpoint')

  if (!endpoint) {
    return {
      ...base,
      status: 'failed',
      error: 'FHIR_ENDPOINT is missing while FHIR_SEND_MODE=http.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  const headers: Record<string, string> = {
    Accept: 'application/fhir+json, application/json',
    'Content-Type': 'application/fhir+json',
  }

  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request.bundle),
      signal: controller.signal,
    })
    const responseSummary = await summarizeFhirHttpResponse(response)

    return {
      ...base,
      status: response.ok ? 'accepted' : 'failed',
      response: responseSummary,
      ...(response.ok ? {} : { error: `FHIR server responded with HTTP ${response.status}.` }),
    }
  } catch (error) {
    return {
      ...base,
      status: 'failed',
      error: getErrorMessage(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Sends a FHIR Bundle through the configured transport.
 *
 * In dummy mode this returns a local acknowledgement. In HTTP mode it performs
 * a real POST with `application/fhir+json` to the configured FHIR endpoint.
 */
export async function sendFhirBundle(
  request: FhirSendInput,
  config: FhirSendConfig,
): Promise<FhirSendResult> {
  if (config.mode === 'http') {
    return postFhirBundleOverHttp(request, config)
  }

  return simulateFhirBundleSend(request)
}
