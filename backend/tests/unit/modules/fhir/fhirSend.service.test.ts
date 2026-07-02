/// <reference types="fhir" />

import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendFhirBundle } from '../../../../src/modules/fhir/fhirSend.service.js'

function createBundle(): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          active: true,
        },
      },
    ],
  }
}

describe('sendFhirBundle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** The sender should post the FHIR JSON Bundle to the configured endpoint. */
  it('sendet ein Bundle per echtem HTTP-POST an den FHIR-Endpunkt', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ resourceType: 'Bundle' }), {
        status: 201,
        headers: {
          'content-type': 'application/fhir+json',
          location: 'https://fhir.example.test/Bundle/server-bundle-123/_history/1',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const bundle = createBundle()
    const result = await sendFhirBundle(
      { target: 'test-fhir-server', bundle },
      {
        endpoint: 'https://fhir.example.test/Bundle',
        authToken: 'test-token',
        timeoutMs: 1000,
      },
    )

    expect(result).toMatchObject({
      mode: 'http',
      status: 'accepted',
      target: 'test-fhir-server',
      response: {
        httpStatus: 201,
        location: 'https://fhir.example.test/Bundle/server-bundle-123/_history/1',
        resourceUrl: 'https://fhir.example.test/Bundle/server-bundle-123',
        resourceId: 'server-bundle-123',
        resourceType: 'Bundle',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://fhir.example.test/Bundle',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/fhir+json, application/json',
          'Content-Type': 'application/fhir+json',
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify(bundle),
      }),
    )
  })

  /** Server-side OperationOutcome failures should be summarized without logging full bodies. */
  it('meldet fehlgeschlagene FHIR-Serverantworten als failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'invalid' }],
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/fhir+json' },
          },
        ),
      ),
    )

    const result = await sendFhirBundle(
      { bundle: createBundle() },
      {
        endpoint: 'https://fhir.example.test/Bundle',
        timeoutMs: 1000,
      },
    )

    expect(result).toMatchObject({
      mode: 'http',
      status: 'failed',
      response: {
        httpStatus: 400,
        resourceType: 'OperationOutcome',
        issueCount: 1,
        issueSeverities: ['error'],
        issueCodes: ['invalid'],
      },
      error: 'FHIR server responded with HTTP 400.',
    })
  })

  /** Sending should fail explicitly when no endpoint is configured. */
  it('meldet fehlenden FHIR-Endpunkt als failed', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendFhirBundle(
      { bundle: createBundle() },
      { timeoutMs: 1000 },
    )

    expect(result).toMatchObject({
      mode: 'http',
      status: 'failed',
      target: 'missing-fhir-endpoint',
      error: 'FHIR_ENDPOINT is missing.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
