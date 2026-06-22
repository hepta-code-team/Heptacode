import { afterEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../../../src/config/env.js'
import { searchNearbyPlaces } from '../../../../src/modules/places/places.service.js'

describe('searchNearbyPlaces', () => {
  const originalApiKey = env.googleMapsApiKey

  afterEach(() => {
    env.googleMapsApiKey = originalApiKey
    vi.unstubAllGlobals()
  })

  it('sucht die empfohlene Fachrichtung und liefert offene sowie geschlossene Orte', async () => {
    env.googleMapsApiKey = 'test-key'
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            id: 'open-place',
            displayName: { text: 'Kardiologie Mannheim' },
            formattedAddress: 'Musterstraße 1, 68159 Mannheim',
            location: { latitude: 49.49, longitude: 8.46 },
            primaryType: 'doctor',
            types: ['doctor', 'health'],
            businessStatus: 'OPERATIONAL',
            currentOpeningHours: {
              openNow: true,
              nextCloseTime: '2026-06-22T17:00:00Z',
              weekdayDescriptions: ['Montag: 08:00–18:00'],
            },
          },
          {
            id: 'closed-place',
            displayName: { text: 'Geschlossene Praxis' },
            formattedAddress: 'Musterstraße 2, 68159 Mannheim',
            location: { latitude: 49.5, longitude: 8.47 },
            primaryType: 'doctor',
            types: ['doctor', 'health'],
            currentOpeningHours: { openNow: false },
          },
        ],
      }),
    } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchNearbyPlaces({
      latitude: 49.487,
      longitude: 8.46,
      careLevel: 'specialist',
      specialties: ['cardiology'],
    })

    expect(result.places).toHaveLength(2)
    expect(result.places[0]?.name).toBe('Kardiologie Mannheim')
    expect(result.places[1]).toMatchObject({ name: 'Geschlossene Praxis', openNow: false })

    const [, request] = fetchMock.mock.calls[0] ?? []
    const requestBody = JSON.parse(String(request?.body)) as Record<string, unknown>
    expect(requestBody).toMatchObject({
      textQuery: 'Kardiologe',
      includedType: 'doctor',
      rankPreference: 'DISTANCE',
    })
    expect(requestBody).not.toHaveProperty('openNow')
    expect(new Headers(request?.headers).get('X-Goog-Api-Key')).toBe('test-key')
  })

  it('sucht nachts bei Nicht-Notfaellen zusaetzlich nach geoeffneten Apotheken', async () => {
    env.googleMapsApiKey = 'test-key'
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: 'night-pharmacy',
              displayName: { text: 'Nacht-Apotheke Mannheim' },
              formattedAddress: 'Musterstraße 3, 68159 Mannheim',
              location: { latitude: 49.48, longitude: 8.45 },
              primaryType: 'pharmacy',
              types: ['pharmacy', 'health'],
              currentOpeningHours: { openNow: true },
            },
          ],
        }),
      } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchNearbyPlaces({
      latitude: 49.487,
      longitude: 8.46,
      careLevel: 'specialist',
      specialties: ['cardiology'],
      includeNightPharmacies: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.places[0]).toMatchObject({
      name: 'Nacht-Apotheke Mannheim',
      primaryType: 'pharmacy',
      openNow: true,
    })

    const pharmacyRequest = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>
    expect(pharmacyRequest).toMatchObject({
      textQuery: 'Apotheke',
      includedType: 'pharmacy',
      openNow: true,
      rankPreference: 'DISTANCE',
      locationBias: { circle: { radius: 20000 } },
    })
  })
})
