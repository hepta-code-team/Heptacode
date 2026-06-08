export const TRIAGE_SYMPTOM_DURATIONS = ['today', 'days', 'week', 'weeks'] as const

export type TriageSymptomDuration = (typeof TRIAGE_SYMPTOM_DURATIONS)[number]

export const SYMPTOM_MEASUREMENT_TYPES = ['pain', 'temperature', 'feeling', 'severity'] as const

export type SymptomMeasurementType = (typeof SYMPTOM_MEASUREMENT_TYPES)[number]

// Initial user selection: body region plus optional detailed localisation.
export interface SelectedSymptom {
  region: string
  side?: string
}

// Expanded symptom data used for triage.
export interface TriageSymptom extends SelectedSymptom {
  details?: string
  measurementType?: SymptomMeasurementType
  measurementValue?: number
  duration?: TriageSymptomDuration
}
