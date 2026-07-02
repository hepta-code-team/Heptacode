import { validateSymptomConsistency } from "../../lib/symptomExtractionApi";
import type { PatientData, SymptomDetailPayload, SymptomDraft } from "../../types/assessment";

type CompleteSymptomDraft = SymptomDraft & {
  duration: NonNullable<SymptomDraft["duration"]>;
};

function hasDuration(symptom: SymptomDraft): symptom is CompleteSymptomDraft {
  return symptom.duration !== undefined;
}

async function validateSymptomInputs(symptoms: SymptomDraft[], patientData?: PatientData) {
  for (const symptom of symptoms) {
    const symptomName = symptom.region.trim();

    if (!symptomName) {
      throw new Error("Bitte geben Sie für jedes erkannte Symptom einen Namen ein.");
    }

    // Only symptoms that originated from AI free-text extraction need consistency validation.
    if (!symptom.isExtractedFromFreeText && !symptom.sourceText?.trim()) {
      continue;
    }

    const regionDetailResult = await validateSymptomConsistency(symptom, patientData);

    if (!regionDetailResult.isRegionMeaningful || regionDetailResult.hasClearContradiction) {
      throw new Error(
        regionDetailResult.message ??
          "Bitte prüfen Sie Symptom/Region und Zusatzdetails. Die Angaben passen nicht zusammen.",
      );
    }
  }
}

type HandleSubmitAssessmentArgs = {
  symptomDetails: SymptomDraft[];
  patientData?: PatientData;
  submitAssessment: (symptoms: SymptomDetailPayload[]) => Promise<unknown>;
  navigate: (path: string) => void;
  setShowValidationErrors: (value: boolean) => void;
  setSubmitError: (value: string | null) => void;
  setIsSubmitting: (value: boolean) => void;
};

export async function handleSubmitAssessment({
  symptomDetails,
  patientData,
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
    region: symptom.region.trim(),
    side: symptom.side,
    ...(symptom.details?.trim() ? { details: symptom.details.trim() } : {}),
    measurementType: symptom.measurementType,
    measurementValue: symptom.measurementValue,
    duration: symptom.duration,
    active: true,
  }));

  setSubmitError(null);
  setIsSubmitting(true);

  try {
    await validateSymptomInputs(completeSymptoms, patientData);
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
