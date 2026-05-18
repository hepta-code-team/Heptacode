import OpenAI from 'openai'
import { env } from '../config/env.js'

const aiApiUrl = new URL(env.aiApiUrl)

if (!['http:', 'https:'].includes(aiApiUrl.protocol)) {
  throw new Error('AI_API_URL must use HTTP or HTTPS')
}

export const aiClient = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: aiApiUrl.toString(),
})

export const aiModel = env.aiModel
