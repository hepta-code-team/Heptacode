/// <reference types="fhir" />

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../../src/app.js'

vi.mock('../../../src/config/env.js', () => ({
  env: {
    port: 3000,
    host: '0.0.0.0',
    corsOrigin: 'http://localhost:5173',
    aiApiUrl: 'http://ai.example.test',
    aiApiKey: 'dummy',
    aiModel: 'test-model',
    fallbackModel: 'fallback-model',
    googleMapsApiKey: undefined,
    fhirEndpoint: 'https://fhir.example.test/Bundle',
    fhirAuthToken: undefined,
    fhirRequestTimeoutMs: 1000,
  },
}))

/** Creates an isolated Fastify instance for each route test. */
async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

function createBundle(): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    id: 'bundle-1',
    type: 'document',
    entry: [
      {
        fullUrl: 'urn:uuid:composition-1',
        resource: {
          resourceType: 'Composition',
          id: 'composition-1',
          status: 'final',
          type: { text: 'HeptaCheck Ersteinschaetzung' },
          date: '2026-06-23T12:00:00.000Z',
          title: 'HeptaCheck - Medizinische Ersteinschaetzung',
        },
      },
      {
        fullUrl: 'urn:uuid:patient-1',
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          active: true,
        },
      },
    ],
  }
}

describe('POST /api/v1/fhir/send', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ resourceType: 'Bundle' }), {
          status: 201,
          headers: {
            'content-type': 'application/fhir+json',
            location: 'https://fhir.example.test/Bundle/server-bundle-456/_history/1',
          },
        }),
      ),
    )
    app = await createApp()
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await app.close()
  })

  /** The endpoint should send a valid FHIR Bundle to the configured FHIR endpoint. */
  it('sendet ein FHIR Bundle per HTTP-POST', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/fhir/send',
      payload: {
        target: 'test-fhir-server',
        bundle: createBundle(),
      },
    })

    const body = response.json()

    expect(response.statusCode).toBe(202)
    expect(body).toMatchObject({
      mode: 'http',
      status: 'accepted',
      target: 'test-fhir-server',
      response: {
        httpStatus: 201,
        location: 'https://fhir.example.test/Bundle/server-bundle-456/_history/1',
        resourceUrl: 'https://fhir.example.test/Bundle/server-bundle-456',
        resourceId: 'server-bundle-456',
        resourceType: 'Bundle',
      },
      bundleSummary: {
        generated: true,
        bundleType: 'document',
        entryCount: 2,
        resourceTypes: ['Composition', 'Patient'],
      },
    })
    expect(body.transmissionId).toMatch(/^http-fhir-/)
    expect(Date.parse(body.submittedAt)).not.toBeNaN()
    expect(fetch).toHaveBeenCalledTimes(1)

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(url).toBe('https://fhir.example.test/Bundle')
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(createBundle())
  })

  /** Invalid payloads should fail before the FHIR send runs. */
  it('antwortet mit 400 bei ungueltigem FHIR-Send-Payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/fhir/send',
      payload: {
        target: '',
        bundle: {
          resourceType: 'Patient',
        },
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is invalid',
      },
    })
  })
})
