import { z } from 'zod'
import { CARE_LEVELS, MEDICAL_SPECIALTIES } from '../../../../shared/result.types.js'

export const nearbyPlacesRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  careLevel: z.enum(CARE_LEVELS),
  specialties: z.array(z.enum(MEDICAL_SPECIALTIES)).max(5).optional(),
  includeNightPharmacies: z.boolean().optional(),
})

export type NearbyPlacesRequest = z.infer<typeof nearbyPlacesRequestSchema>
