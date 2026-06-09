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
    substanceInfluence: string
    recentAbroad: boolean
    recentAbroadDetails: string
    conditions: string[]
    isSmoker: boolean
    smokingSinceYears: string
    cigarettesPerDay: string
    conditionDetails: Record<string, string>
}