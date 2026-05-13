import OpenAI from "openai";

export const medgemma = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.BASE_URL,
});
