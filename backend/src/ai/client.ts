import OpenAI from "openai";
import{ env } from "../config/env.js"

const protocol = new URL(env.aiAPiUrl).protocol;
if (protocol !== "http:" && protocol !== "https:") {
  throw new Error("AI_API_URL must use HTTP or HTTPS.");
}

export const aiClient = new OpenAI({
  apiKey: env.aiApiKey,
  baseURL: env.aiApiUrl,
})

export const aiModel  = env.aiModel