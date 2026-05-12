import OpenAI from 'openai'
import { env } from '../config/env.js'

const baseURL = env

export const aiClient = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: env.aiApiUrl,
})
