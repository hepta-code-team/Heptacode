export type SymptomExtractionResult = {
  rawText: string
}

export type ReviewSummaryInput = {
  patientData: Record<string, unknown>
  symptoms: string[]
}

export type ReviewSummaryResult = {
  summaryText: string
}

// TODO(TA2): Diese Typen mit Zod-Schemas absichern.
// TODO(TA2): Response-Strukturen final festlegen und mit TA3-Endpunkten abstimmen.
