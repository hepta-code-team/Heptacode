import type { Symptom } from "../../types/assessment";

type HandleSubmitAssessmentArgs = {
  symptomDetails: Symptom[];
  submitAssessment: (symptoms: Symptom[]) => Promise<void>;
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

  if (activeSymptoms.some((symptom) => symptom.duration === "")) {
    setShowValidationErrors(true);
    return;
  }

  setSubmitError(null);
  setIsSubmitting(true);

  try {
    await submitAssessment(activeSymptoms);
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