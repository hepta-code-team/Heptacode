import type { PatientData } from "../types/assessment";

type NumericPatientDataField = Extract<
  keyof PatientData,
  "birthMonth" | "birthYear" | "height" | "weight"
>;

export function normalizePatientNumericInput(field: NumericPatientDataField, value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (field === "birthMonth") {
    if (digitsOnly.length <= 2) {
      return digitsOnly;
    }

    return digitsOnly.replace(/^0+(?=\d)/, "").slice(0, 2);
  }

  return digitsOnly.replace(/^0+(?=\d)/, "");
}
