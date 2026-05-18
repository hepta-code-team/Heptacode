// Typ für das ausgewählte Symptom
export interface TriageSymptom {
    region: string
    side?: string
    painLevel?: number
    duration?: TriageSymptomDuration
}

export type TriageSymptomDuration = 'today' | 'days' | 'week' | 'weeks'
