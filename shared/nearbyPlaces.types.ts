import type { CareLevel, MedicalSpecialty } from './result.types.js'

export interface NearbyPlacesRequest {
  latitude: number
  longitude: number
  careLevel: CareLevel
  specialties?: MedicalSpecialty[]
  includeNightPharmacies?: boolean
}

export interface NearbyPlace {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  primaryType?: string
  types: string[]
  openNow?: boolean
  weekdayDescriptions: string[]
  nextCloseTime?: string
  googleMapsUri?: string
}

export interface NearbyPlacesResponse {
  provider: 'google'
  places: NearbyPlace[]
}
