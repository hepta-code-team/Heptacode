import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../../../src/app.js'
import { env } from '../../../src/config/env.js'

async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

describe('POST /places/nearby', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    env.googleMapsApiKey = 'test-google-key'
    app = await createApp()
  })

  afterEach(async () => {
    await app.close()
    vi.unstubAllGlobals()
  })

  it('normalisiert Google Places Treffer fuer das Frontend', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        places: [
          {
            id: 'place-1',
            displayName: { text: 'Neurologie am Park' },
            formattedAddress: 'Parkstraße 1, 68161 Mannheim',
            location: { latitude: 49.487, longitude: 8.466 },
            businessStatus: 'OPERATIONAL',
            types: ['doctor'],
            currentOpeningHours: {
              openNow: true,
              weekdayDescriptions: ['Donnerstag: 08:00–18:00'],
            },
          },
        ],
      }),
      text: async () => '',
    } as Response))

    const response = await app.inject({
      method: 'POST',
      url: '/places/nearby',
      payload: {
        latitude: 49.487,
        longitude: 8.46,
        careLevel: 'specialist',
        specialtyLabel: 'Neurologie',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      facilities: [
        {
          id: 'google-place-1',
          name: 'Neurologie am Park',
          type: 'Neurologie',
          address: 'Parkstraße 1, 68161 Mannheim',
          openingHoursText: ['Donnerstag: 08:00–18:00'],
        },
      ],
    })
  })
})
