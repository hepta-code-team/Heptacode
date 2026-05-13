import type { SummaryResponse } from './summary.types.js'

const summaryStore = new Map<string, SummaryResponse>()

export function saveSummary(summary: SummaryResponse): void {
  summaryStore.set(summary.summaryId, summary)
}

export function getSummary(summaryId: string): SummaryResponse | undefined {
  return summaryStore.get(summaryId)
}