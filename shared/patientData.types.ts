// Patient Data
export interface PatientDataDuration {
    months: string
    years: string
    sinceBirth?: boolean
}

export interface PatientData {
    birthMonth: string
    birthYear: string
    height: string
    weight: string
    gender: string
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
    allergyDuration?: PatientDataDuration
    medicationDuration?: PatientDataDuration
    conditionDurations?: Record<string, PatientDataDuration>
}
