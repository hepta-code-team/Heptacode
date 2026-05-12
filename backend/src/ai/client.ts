import OpenAI from 'openai'
import { env } from '../config/env.js'

if (!env.aiApiUrl.startsWith('https://')) {
  throw new Error('AI_API_URL must use HTTPS')
}

export const aiClient = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: env.aiApiUrl,
})

export const aiModel = env.aiModel
