// Patient Data
export interface PatientData {
    birthMonth: string
    birthYear: string
    height: string
    weight: string
    gender: string
    isPregnant: boolean
    isBreastfeeding: boolean
    currentMood?: string
    smokerStatus?: string
    takesBloodThinners?: boolean
    immuneSystemStatus?: string
    immuneSystemDetails?: string
    drugDetails?: string
    allergies: string
    medications: string
    substanceInfluence: string
    recentAbroad: boolean
    recentAbroadDetails: string
    conditions: string[]
}
