import type { FastifyPluginAsync } from 'fastify'
import { nearbyPlacesRequestSchema } from '../modules/places/places.types.js'
import { searchNearbyPlaces } from '../modules/places/places.service.js'

export const placesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/places/nearby', async (request, reply) => {
    const body = nearbyPlacesRequestSchema.parse(request.body)
    const result = await searchNearbyPlaces(body)

    return reply.send(result)
  })
}
