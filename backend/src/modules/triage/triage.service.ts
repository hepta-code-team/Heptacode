import { createPdfSummary } from '../pdf/pdfExport.service.js'
import type { Assessment, CareLevel, Symptom, TriageResponse } from './triage.types.js'

function isMultipleDays(duration: string): boolean {
  return ['days', 'week', 'weeks'].includes(duration)
}

function getSymptomCareLevel(symptom: Symptom): CareLevel {
  if (symptom.measurementType === 'temperature') {
    if (symptom.measurementValue >= 40 && isMultipleDays(symptom.duration)) {
      return 'emergency'
    }

    if (symptom.measurementValue >= 39) {
      return 'doctor'
    }

    return 'selfcare'
  }

  if (symptom.measurementValue >= 8) {
    return 'emergency'
  }

  if (symptom.measurementValue >= 5) {
    return 'doctor'
  }

  return 'selfcare'
}

function getHighestCareLevel(levels: CareLevel[]): CareLevel {
  if (levels.includes('emergency')) {
    return 'emergency'
  }

  if (levels.includes('doctor')) {
    return 'doctor'
  }

  return 'selfcare'
}

function symptomLabel(symptom: Symptom): string {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region
}

function getReason(symptom: Symptom, level: CareLevel): string {
  const label = symptomLabel(symptom)

  if (symptom.measurementType === 'temperature') {
    if (level === 'emergency') {
      return `${label}: sehr hohes Fieber über mehrere Tage`
    }

    if (level === 'doctor') {
      return `${label}: erhöhte Temperatur`
    }

    return `${label}: Temperatur unterhalb der Schwelle für einen zeitnahen Arztkontakt`
  }

  if (level === 'emergency') {
    return `${label}: sehr starke Intensität`
  }

  if (level === 'doctor') {
    return `${label}: mittlere bis starke Intensität`
  }

  return `${label}: unterhalb der Schwelle für einen zeitnahen Arztkontakt`
}

export function evaluateTriage(
  assessment: Assessment,
  emergencyFromLanding?: boolean,
): TriageResponse {
  if (emergencyFromLanding) {
    return {
      careLevel: 'emergency',
      reasons: ['Notfallmodus über die Startseite ausgewählt.'],
      pdfSummary: createPdfSummary(assessment),
    }
  }

  const activeSymptoms = assessment.symptomDetails.filter((symptom) => symptom.active)

  if (activeSymptoms.length === 0) {
    return {
      careLevel: 'selfcare',
      reasons: [],
      pdfSummary: createPdfSummary(assessment),
    }
  }

  const levels = activeSymptoms.map(getSymptomCareLevel)
  const careLevel = getHighestCareLevel(levels)

  return {
    careLevel,
    reasons: activeSymptoms
      .filter((symptom) => getSymptomCareLevel(symptom) === careLevel)
      .map((symptom) => getReason(symptom, careLevel)),
    pdfSummary: createPdfSummary(assessment),
  }
}
