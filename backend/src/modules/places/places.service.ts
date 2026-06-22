import type { MedicalSpecialty } from '../../../../shared/result.types.js'
import type { NearbyPlace, NearbyPlacesResponse } from '../../../../shared/nearbyPlaces.types.js'
import { ApiError } from '../../common/errors/ApiError.js'
import { env } from '../../config/env.js'
import type { NearbyPlacesRequest } from './places.types.js'

const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const GOOGLE_MEDICAL_TYPES = new Set([
  'doctor',
  'general_hospital',
  'hospital',
  'medical_center',
  'medical_clinic',
  'pharmacy',
  'skin_care_clinic',
])
const GOOGLE_PLACE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.businessStatus',
  'places.currentOpeningHours',
  'places.googleMapsUri',
].join(',')

const SPECIALTY_SEARCH_TERMS: Record<MedicalSpecialty, string | null> = {
  home_care: 'Ambulanter Pflegedienst',
  emergency_medicine: 'Notaufnahme',
  general_practice: 'Hausarzt',
  internal_medicine: 'Internist',
  cardiology: 'Kardiologe',
  neurology: 'Neurologe',
  orthopedics: 'Orthopäde',
  gastroenterology: 'Gastroenterologe',
  pulmonology: 'Lungenarzt',
  dermatology: 'Hautarzt',
  urology: 'Urologe',
  gynecology: 'Frauenarzt',
  psychiatry: 'Psychiater',
  pediatrics: 'Kinderarzt',
  dentistry: null,
  ophthalmology: 'Augenarzt',
  otolaryngology: 'HNO-Arzt',
}

type GoogleOpeningHours = {
  openNow?: boolean
  nextCloseTime?: string
  weekdayDescriptions?: string[]
}

type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  primaryType?: string
  types?: string[]
  businessStatus?: string
  currentOpeningHours?: GoogleOpeningHours
  googleMapsUri?: string
}

type GooglePlacesResponse = {
  places?: GooglePlace[]
  error?: { message?: string; status?: string }
}

type SearchConfig = {
  query: string
  includedType: string
  radius: number
  openNow?: boolean
}

function getPrimarySearchConfig(request: NearbyPlacesRequest): SearchConfig | null {
  if (request.careLevel === 'emergency') {
    return { query: 'Notaufnahme', includedType: 'hospital', radius: 12000 }
  }

  if (request.careLevel === 'selfcare') {
    return { query: 'Apotheke', includedType: 'pharmacy', radius: 8000 }
  }

  if (request.careLevel === 'specialist') {
    const specialty = request.specialties?.find((value) => value !== 'dentistry')
    const query = specialty ? SPECIALTY_SEARCH_TERMS[specialty] : null

    return query ? { query, includedType: 'doctor', radius: 15000 } : null
  }

  return { query: 'Hausarzt', includedType: 'doctor', radius: 8000 }
}

function getSearchConfigs(request: NearbyPlacesRequest) {
  const primaryConfig = getPrimarySearchConfig(request)
  const configs = primaryConfig ? [primaryConfig] : []

  if (
    request.includeNightPharmacies &&
    request.careLevel !== 'emergency' &&
    request.careLevel !== 'selfcare'
  ) {
    configs.push({
      query: 'Apotheke',
      includedType: 'pharmacy',
      radius: 20000,
      openNow: true,
    })
  }

  return configs
}

function isRelevantPlace(place: GooglePlace, request: NearbyPlacesRequest) {
  const types = new Set([place.primaryType, ...(place.types ?? [])].filter(Boolean))

  if (request.careLevel === 'selfcare') {
    return types.has('pharmacy')
  }

  if (request.careLevel === 'emergency') {
    return types.has('hospital') || types.has('general_hospital')
  }

  return [...types].some((type) => type !== undefined && GOOGLE_MEDICAL_TYPES.has(type))
}

function normalizePlace(place: GooglePlace, request: NearbyPlacesRequest): NearbyPlace | null {
  const latitude = place.location?.latitude
  const longitude = place.location?.longitude
  const name = place.displayName?.text?.trim()
  const address = place.formattedAddress?.trim()

  if (
    !place.id ||
    !name ||
    !address ||
    latitude === undefined ||
    longitude === undefined ||
    place.businessStatus === 'CLOSED_PERMANENTLY' ||
    !isRelevantPlace(place, request)
  ) {
    return null
  }

  return {
    id: place.id,
    name,
    address,
    latitude,
    longitude,
    primaryType: place.primaryType,
    types: place.types ?? [],
    ...(typeof place.currentOpeningHours?.openNow === 'boolean'
      ? { openNow: place.currentOpeningHours.openNow }
      : {}),
    weekdayDescriptions: place.currentOpeningHours?.weekdayDescriptions ?? [],
    ...(place.currentOpeningHours?.nextCloseTime
      ? { nextCloseTime: place.currentOpeningHours?.nextCloseTime }
      : {}),
    ...(place.googleMapsUri ? { googleMapsUri: place.googleMapsUri } : {}),
  }
}

async function requestGooglePlaces(request: NearbyPlacesRequest, config: SearchConfig) {
  const response = await fetch(GOOGLE_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': GOOGLE_PLACE_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: config.query,
      includedType: config.includedType,
      strictTypeFiltering: false,
      ...(config.openNow !== undefined ? { openNow: config.openNow } : {}),
      pageSize: 10,
      rankPreference: 'DISTANCE',
      languageCode: 'de',
      regionCode: 'DE',
      locationBias: {
        circle: {
          center: {
            latitude: request.latitude,
            longitude: request.longitude,
          },
          radius: config.radius,
        },
      },
    }),
  })

  const body = (await response.json()) as GooglePlacesResponse

  if (!response.ok) {
    throw new ApiError(
      502,
      'GOOGLE_PLACES_REQUEST_FAILED',
      'Google Places konnte nicht abgefragt werden',
      { status: body.error?.status, message: body.error?.message },
    )
  }

  return body.places ?? []
}

export async function searchNearbyPlaces(request: NearbyPlacesRequest): Promise<NearbyPlacesResponse> {
  if (!env.googleMapsApiKey) {
    throw new ApiError(503, 'GOOGLE_PLACES_NOT_CONFIGURED', 'Google Places ist nicht konfiguriert')
  }

  const configs = getSearchConfigs(request)

  if (configs.length === 0) {
    return { provider: 'google', places: [] }
  }

  const responses = await Promise.all(configs.map((config) => requestGooglePlaces(request, config)))
  const uniquePlaces = new Map<string, NearbyPlace>()

  responses.flat().forEach((place) => {
    const normalizedPlace = normalizePlace(place, request)

    if (normalizedPlace) {
      uniquePlaces.set(normalizedPlace.id, normalizedPlace)
    }
  })

  return {
    provider: 'google',
    places: [...uniquePlaces.values()],
  }
}
