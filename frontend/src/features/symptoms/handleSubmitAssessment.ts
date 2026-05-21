import type { SymptomDetailPayload, SymptomMeasurementType } from "../../types/assessment";
import type { TriageSymptomDuration } from "../../../../shared/symptom.types";
import { getMeasurementConfig } from "./symptoms.constants";

type SymptomDraft = {
  id: string;
  region: string;
  side?: string;
  painLevel?: number;
  measurementValue?: number;
  duration?: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
};

type HandleSubmitAssessmentArgs = {
  symptomDetails: SymptomDraft[];
  submitAssessment: (symptoms: SymptomDetailPayload[]) => Promise<unknown>;
  navigate: (path: string) => void;
  setShowValidationErrors: (value: boolean) => void;
  setSubmitError: (value: string | null) => void;
  setIsSubmitting: (value: boolean) => void;
};

export async function handleSubmitAssessment({
  symptomDetails,
  submitAssessment,
  navigate,
  setShowValidationErrors,
  setSubmitError,
  setIsSubmitting,
}: HandleSubmitAssessmentArgs) {
  const activeSymptoms = symptomDetails.filter((symptom) => symptom.active);

  if (activeSymptoms.some((symptom) => !symptom.duration)) {
    setShowValidationErrors(true);
    return;
  }

  const payloadSymptoms: SymptomDetailPayload[] = activeSymptoms.map((symptom) => ({
    id: symptom.id,
    region: symptom.region,
    side: symptom.side,
    measurementType: symptom.measurementType,
    measurementValue: symptom.measurementValue ?? symptom.painLevel ?? getMeasurementConfig(symptom.region, symptom.side).defaultValue,
    duration: (symptom.duration as TriageSymptomDuration) ?? "today",
    active: true,
  }));

  setSubmitError(null);
  setIsSubmitting(true);

  try {
    await submitAssessment(payloadSymptoms);
    navigate("/result");
  } catch (error) {
    setSubmitError(
      error instanceof Error
        ? error.message
        : "Die Daten konnten nicht an das Backend gesendet werden.",
    );
  } finally {
    setIsSubmitting(false);
  }
}