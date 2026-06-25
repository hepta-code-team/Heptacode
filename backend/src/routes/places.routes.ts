import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { env } from '../config/env.js'

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

const nearbyPlacesPayloadSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  careLevel: z.enum(['selfcare', 'doctor', 'specialist', 'emergency']),
  specialtyLabel: z.string().optional(),
})

type NearbyPlacesPayload = z.infer<typeof nearbyPlacesPayloadSchema>

type GooglePlace = {
  id?: string
  displayName?: {
    text?: string
  }
  formattedAddress?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  businessStatus?: string
  types?: string[]
  currentOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
}

type GooglePlacesResponse = {
  places?: GooglePlace[]
}

function getGoogleTextQuery(payload: NearbyPlacesPayload) {
  if (payload.careLevel === 'selfcare') {
    return 'Apotheke'
  }

  if (payload.careLevel === 'emergency') {
    return 'Notaufnahme Krankenhaus'
  }

  if (payload.careLevel === 'specialist' && payload.specialtyLabel) {
    return `${payload.specialtyLabel} Arztpraxis`
  }

  return 'Hausarzt Allgemeinmedizin Arztpraxis'
}

function getGoogleIncludedType(careLevel: NearbyPlacesPayload['careLevel']) {
  if (careLevel === 'selfcare') return 'pharmacy'
  if (careLevel === 'emergency') return 'hospital'
  return 'doctor'
}

function getGoogleSearchRadius(careLevel: NearbyPlacesPayload['careLevel']) {
  if (careLevel === 'emergency') return 12000
  if (careLevel === 'specialist') return 15000
  return 8000
}

function getGoogleFacilityType(place: GooglePlace, payload: NearbyPlacesPayload) {
  if (payload.careLevel === 'selfcare' || place.types?.includes('pharmacy')) {
    return 'Apotheke'
  }

  if (payload.careLevel === 'emergency' || place.types?.includes('hospital')) {
    return 'Notaufnahme'
  }

  if (payload.careLevel === 'specialist' && payload.specialtyLabel) {
    return payload.specialtyLabel
  }

  return 'Hausarzt'
}

function calculateDistanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latDelta = toRadians(to.latitude - from.latitude)
  const lonDelta = toRadians(to.longitude - from.longitude)
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)))
}

export const placesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/places/nearby', async (request, reply) => {
    const parsedPayload = nearbyPlacesPayloadSchema.safeParse(request.body)

    if (!parsedPayload.success) {
      throw parsedPayload.error
    }

    if (!env.googleMapsApiKey) {
      return reply.code(503).send({
        message: 'Google Maps API key is not configured.',
      })
    }

    const payload = parsedPayload.data
    const googleResponse = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleMapsApiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.types,places.currentOpeningHours',
      },
      body: JSON.stringify({
        textQuery: getGoogleTextQuery(payload),
        includedType: getGoogleIncludedType(payload.careLevel),
        strictTypeFiltering: payload.careLevel !== 'specialist',
        openNow: true,
        pageSize: 10,
        languageCode: 'de',
        regionCode: 'DE',
        locationBias: {
          circle: {
            center: {
              latitude: payload.latitude,
              longitude: payload.longitude,
            },
            radius: getGoogleSearchRadius(payload.careLevel),
          },
        },
      }),
    })

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text()
      request.log.warn(
        { status: googleResponse.status, errorText },
        'Google Places request failed',
      )

      return reply.code(googleResponse.status === 429 ? 429 : 502).send({
        message: 'Google Places is unavailable.',
      })
    }

    const data = (await googleResponse.json()) as GooglePlacesResponse
    const facilities = (data.places ?? [])
      .filter((place) => (
        place.id &&
        place.displayName?.text &&
        place.formattedAddress &&
        Number.isFinite(place.location?.latitude) &&
        Number.isFinite(place.location?.longitude) &&
        place.businessStatus !== 'CLOSED_PERMANENTLY' &&
        place.currentOpeningHours?.openNow === true
      ))
      .map((place) => {
        const latitude = place.location?.latitude as number
        const longitude = place.location?.longitude as number

        return {
          id: `google-${place.id}`,
          name: place.displayName?.text as string,
          hasKnownName: true,
          type: getGoogleFacilityType(place, payload),
          latitude,
          longitude,
          openingHours: '24/7',
          openingHoursText: place.currentOpeningHours?.weekdayDescriptions ?? [],
          address: place.formattedAddress as string,
          priority: 'recommended' as const,
          distanceMeters: calculateDistanceMeters(payload, { latitude, longitude }),
        }
      })
      .sort((first, second) => first.distanceMeters - second.distanceMeters)
      .slice(0, 4)

    return reply.send({ facilities })
  })
}
