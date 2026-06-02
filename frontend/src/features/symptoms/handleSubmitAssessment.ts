import type { SymptomDetailPayload, SymptomDraft } from "../../types/assessment";

type CompleteSymptomDraft = SymptomDraft & {
  duration: NonNullable<SymptomDraft["duration"]>;
};

function hasDuration(symptom: SymptomDraft): symptom is CompleteSymptomDraft {
  return symptom.duration !== undefined;
}

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

  if (activeSymptoms.some((symptom) => !hasDuration(symptom))) {
    setShowValidationErrors(true);
    return;
  }

  const completeSymptoms = activeSymptoms.filter(hasDuration);

  const payloadSymptoms: SymptomDetailPayload[] = completeSymptoms.map((symptom) => ({
    id: symptom.id,
    region: symptom.region,
    side: symptom.side,
    measurementType: symptom.measurementType,
    measurementValue: symptom.measurementValue,
    duration: symptom.duration,
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
