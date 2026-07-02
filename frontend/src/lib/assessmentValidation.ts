import { TRIAGE_SYMPTOM_DURATIONS, type SymptomMeasurementType } from "../../../shared/symptom.types";
import type { PatientData, SelectedSymptom, SymptomDetailPayload } from "../types/assessment";

export const WEIGHT_MIN = 3;
export const WEIGHT_MAX = 300;
export const HEIGHT_MIN = 45;
export const HEIGHT_MAX = 250;
export const BIRTH_MONTH_MIN = 1;
export const BIRTH_MONTH_MAX = 12;
export const MAX_PATIENT_AGE_YEARS = 125;

const MEASUREMENT_RANGES: Record<SymptomMeasurementType, { min: number; max: number }> = {
  pain: { min: 0, max: 10 },
  temperature: { min: 38, max: 42.5 },
  feeling: { min: 1, max: 10 },
  severity: { min: 1, max: 10 },
};

export function isNumberInRange(value: string | number, min: number, max: number) {
  const numberValue = Number(value);

  return value !== "" && Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

export function isValidPatientData(patientData: PatientData | null): patientData is PatientData {
  if (!patientData) {
    return false;
  }

  const currentYear = new Date().getFullYear();

  return Boolean(patientData.gender) &&
    isNumberInRange(patientData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX) &&
    isNumberInRange(patientData.birthYear, currentYear - MAX_PATIENT_AGE_YEARS, currentYear) &&
    isNumberInRange(patientData.height, HEIGHT_MIN, HEIGHT_MAX) &&
    isNumberInRange(patientData.weight, WEIGHT_MIN, WEIGHT_MAX);
}

export function hasRequiredSymptoms(selectedSymptoms: SelectedSymptom[]) {
  return selectedSymptoms.length > 0;
}

export function isValidSymptomMeasurement(symptom: Pick<SymptomDetailPayload, "measurementType" | "measurementValue">) {
  const measurementRange = MEASUREMENT_RANGES[symptom.measurementType];

  return Boolean(measurementRange) &&
    isNumberInRange(symptom.measurementValue, measurementRange.min, measurementRange.max);
}

export function hasCompleteSymptomDetails(symptomDetails: SymptomDetailPayload[]) {
  return symptomDetails.length > 0 && symptomDetails.every((symptom) =>
    symptom.active &&
      TRIAGE_SYMPTOM_DURATIONS.includes(symptom.duration) &&
      isValidSymptomMeasurement(symptom),
  );
}
