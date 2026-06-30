/// <reference types="fhir" />

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../../src/app.js'

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
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
  })

  /** The dummy endpoint should acknowledge a valid FHIR Bundle without external IO. */
  it('simuliert den Versand eines FHIR Bundles', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/fhir/send',
      payload: {
        target: 'showcase-kis',
        bundle: createBundle(),
      },
    })

    const body = response.json()

    expect(response.statusCode).toBe(202)
    expect(body).toMatchObject({
      mode: 'dummy',
      status: 'accepted',
      target: 'showcase-kis',
      bundleSummary: {
        generated: true,
        bundleType: 'document',
        entryCount: 2,
        resourceTypes: ['Composition', 'Patient'],
      },
    })
    expect(body.transmissionId).toMatch(/^dummy-fhir-/)
    expect(Date.parse(body.submittedAt)).not.toBeNaN()
  })

  /** Invalid payloads should fail before the dummy send simulation runs. */
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
