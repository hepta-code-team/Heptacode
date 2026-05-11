import OpenAI from "openai";

export const medgemma = new OpenAI({
  apiKey: process.env.API_KEY ?? "dummy",
  baseURL: process.env.Base_URL,
});
