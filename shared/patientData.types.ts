// Details for one selected pre-existing condition.
export interface ConditionDetail {
    condition: string
    detail: string
    duration: string
}

export type SmokingStatus = "Nein" | "Gelegentlich" | "Ja"

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
    recentAbroad: boolean
    recentAbroadDetails: string
    conditions: string[]
    smokingStatus?: SmokingStatus
    isSmoker: boolean
    smokingSinceYears: string
    cigarettesPerDay: string
    conditionDetails: Record<string, ConditionDetail>
}
