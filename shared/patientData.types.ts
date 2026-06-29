// Details for one selected pre-existing condition.
export interface ConditionDetail {
    condition: string
    detail: string
    duration: string
}

// Patient data collected before the symptom assessment.
export interface PatientData {
    birthMonth: string
    birthYear: string
    height: string
    weight: string
    gender: string
    mood?: string
    isPregnant: boolean
    isBreastfeeding: boolean
    allergies: string
    medications: string
    medicationDuration?: string
    substanceInfluence: string
    alcoholSince?: string
    alcoholFrequencyPerDay?: string
    drugDetails?: string
    drugSince?: string
    drugFrequencyPerDay?: string
    recentAbroad: string
    recentAbroadDetails: string
    conditions: string[]
    isSmoker: string
    smokingSinceYears: string
    cigarettesPerDay: string
    conditionDetails: Record<string, ConditionDetail>
}