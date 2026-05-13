import OpenAI from 'openai'
import { env } from '../config/env.js'

const protocol = new URL(env.aiApiUrl).protocol

if (protocol !== 'https:' && protocol !== 'http:') {
  throw new Error('AI_API_URL must use HTTP or HTTPS')
}

export const aiClient = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: env.aiApiUrl,
})

export const aiModel = env.aiModel
