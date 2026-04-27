import  openai from "openai";

export const medgemma = new openai({
    apiKey:'dummy',
    baseURL: process.env.Base_URL,
})