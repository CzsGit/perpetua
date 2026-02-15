import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
})

export const AI_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview'

export { openai }
