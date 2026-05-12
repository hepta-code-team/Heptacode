import { RED_FLAG_RULES } from './redflag.rules.js'
import type { RedFlagCheckResponse } from './redflag.types.js'

export function checkRedFlags(text: string): RedFlagCheckResponse {
  const normalizedText = text.toLowerCase()
  const matches = RED_FLAG_RULES.filter((rule) => normalizedText.includes(rule))

  return {
    hasRedFlags: matches.length > 0,
    matches: [...matches],
  }
}
