export const TRIAGE_SYMPTOM_DURATIONS = ['today', 'days', 'week', 'weeks'] as const

export type TriageSymptomDuration = (typeof TRIAGE_SYMPTOM_DURATIONS)[number]

export const SYMPTOM_MEASUREMENT_TYPES = ['pain', 'temperature', 'feeling', 'severity'] as const

export type SymptomMeasurementType = (typeof SYMPTOM_MEASUREMENT_TYPES)[number]

export interface SelectedSymptom {
  region: string
  side?: string
}

export interface TriageSymptom extends SelectedSymptom {
  measurementType?: SymptomMeasurementType
  measurementValue?: number
  duration?: TriageSymptomDuration
}
