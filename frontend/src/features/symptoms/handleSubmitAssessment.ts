import { validateSymptomInput } from "../../lib/symptomExtractionApi";
import type { PatientData, SymptomDetailPayload, SymptomDraft } from "../../types/assessment";

type CompleteSymptomDraft = SymptomDraft & {
  duration: NonNullable<SymptomDraft["duration"]>;
};

function hasDuration(symptom: SymptomDraft): symptom is CompleteSymptomDraft {
  return symptom.duration !== undefined;
}

function validateEditableSymptomNames(symptoms: SymptomDraft[]) {
  for (const symptom of symptoms) {
    if (!symptom.isNameEditable) {
      continue;
    }

    const symptomName = symptom.region.trim();

    if (!symptomName) {
      throw new Error("Bitte geben Sie für jedes erkannte Symptom einen Namen ein.");
    }
  }
}

async function validateEditableSymptomMedicalContext(
  symptoms: SymptomDraft[],
  patientData?: PatientData,
) {
  for (const symptom of symptoms) {
    if (!symptom.isNameEditable) {
      continue;
    }

    const symptomName = symptom.region.trim();
    const symptomNameResult = await validateSymptomInput(symptomName, "text", patientData);

    if (!symptomNameResult.isValidMedicalInput) {
      throw new Error(
        symptomNameResult.message ??
          "Bitte prüfen Sie den bearbeiteten Symptomnamen. Er muss weiterhin einen medizinischen Kontext beschreiben.",
      );
    }

    const details = symptom.details?.trim();

    if (!details) {
      continue;
    }

    const detailsResult = await validateSymptomInput(details, "text", patientData);

    if (!detailsResult.isValidMedicalInput) {
      throw new Error(
        detailsResult.message ??
          "Bitte prüfen Sie die bearbeiteten Zusatzdetails. Sie müssen weiterhin einen medizinischen Kontext beschreiben.",
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
    validateEditableSymptomNames(completeSymptoms);
    await validateEditableSymptomMedicalContext(completeSymptoms, patientData);
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
