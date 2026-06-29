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
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce({
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
          {
            id: 'place-2',
            displayName: { text: 'Geschlossene Neurologie' },
            formattedAddress: 'Waldstraße 2, 68161 Mannheim',
            location: { latitude: 49.49, longitude: 8.47 },
            businessStatus: 'OPERATIONAL',
            types: ['doctor'],
            currentOpeningHours: {
              openNow: false,
              weekdayDescriptions: ['Donnerstag: 08:00–12:00'],
            },
          },
        ],
      }),
      text: async () => '',
    } as Response)
    vi.stubGlobal('fetch', fetchMock)

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
          isOpenNow: true,
        },
        {
          id: 'google-place-2',
          name: 'Geschlossene Neurologie',
          isOpenNow: false,
        },
      ],
    })

    const googleRequest = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(googleRequest).not.toHaveProperty('openNow')
  })

  it('liefert hoechstens die fuenf naechsten Einrichtungen nach Entfernung', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        places: Array.from({ length: 6 }, (_, index) => {
          const distanceOrder = 6 - index

          return {
            id: `place-${distanceOrder}`,
            displayName: { text: `Praxis ${distanceOrder}` },
            formattedAddress: `Straße ${distanceOrder}, 68161 Mannheim`,
            location: { latitude: 49.487, longitude: 8.46 + distanceOrder * 0.01 },
            businessStatus: 'OPERATIONAL',
            types: ['doctor'],
            currentOpeningHours: { openNow: false },
          }
        }),
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

    const facilities = response.json().facilities

    expect(facilities).toHaveLength(5)
    expect(facilities.map((facility: { name: string }) => facility.name)).toEqual([
      'Praxis 1',
      'Praxis 2',
      'Praxis 3',
      'Praxis 4',
      'Praxis 5',
    ])
  })
})
