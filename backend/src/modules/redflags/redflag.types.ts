import { z } from 'zod'

export interface RedFlagCheckRequest {
  text: string
}

export interface RedFlagCheckResponse {
  hasRedFlags: boolean
  matches: string[]
}

export const redFlagCheckRequestSchema = z.object({
  text: z.string().trim().min(1),
})
