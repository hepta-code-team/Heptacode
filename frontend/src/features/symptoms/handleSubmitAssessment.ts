import { validateSymptomDetailInput } from "../../lib/symptomExtractionApi";
import type { PatientData, SymptomDetailPayload, SymptomDraft } from "../../types/assessment";

type CompleteSymptomDraft = SymptomDraft & {
  duration: NonNullable<SymptomDraft["duration"]>;
};

function hasDuration(symptom: SymptomDraft): symptom is CompleteSymptomDraft {
  return symptom.duration !== undefined;
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function hasSymptomNameChanged(symptom: SymptomDraft) {
  return symptom.region.trim() !== normalizeOptionalText(symptom.originalRegion) ||
    normalizeOptionalText(symptom.side) !== normalizeOptionalText(symptom.originalSide);
}

function hasSymptomDetailsChanged(symptom: SymptomDraft) {
  return normalizeOptionalText(symptom.details) !== normalizeOptionalText(symptom.originalDetails);
}

function buildExtractedSymptomValidationText(symptom: SymptomDraft) {
  const symptomParts = [
    symptom.region.trim(),
    symptom.side?.trim(),
    symptom.details?.trim(),
  ].filter(Boolean);

  return [
    symptom.sourceText?.trim(),
    `Symptom: ${symptomParts.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function validateEditableSymptomInputs(symptoms: SymptomDraft[], patientData?: PatientData) {
  for (const symptom of symptoms) {
    if (!symptom.isNameEditable) {
      continue;
    }

    const symptomName = symptom.region.trim();

    if (!symptomName) {
      throw new Error("Bitte geben Sie für jedes erkannte Symptom einen Namen ein.");
    }

    if (hasSymptomNameChanged(symptom)) {
      const symptomNameResult = await validateSymptomDetailInput(symptomName, "text", patientData);

      if (!symptomNameResult.isValidMedicalInput) {
        throw new Error(
          symptomNameResult.message ??
            "Bitte geben Sie ein sinnvolles Symptom oder medizinisches Stichwort ein.",
        );
      }
    } else {
      const symptomContext = buildExtractedSymptomValidationText(symptom);
      const symptomContextResult = await validateSymptomDetailInput(symptomContext, "text", patientData);

      if (!symptomContextResult.isValidMedicalInput) {
        throw new Error(
          symptomContextResult.message ??
            "Bitte geben Sie ein sinnvolles Symptom oder medizinisches Stichwort ein.",
        );
      }
    }

    if (symptom.details !== undefined && hasSymptomDetailsChanged(symptom)) {
      const details = symptom.details.trim();

      if (!details) {
        continue;
      }

      const detailsResult = await validateSymptomDetailInput(details, "text", patientData);

      if (!detailsResult.isValidMedicalInput) {
        throw new Error(
          detailsResult.message ??
            "Bitte geben Sie sinnvolle medizinische Zusatzdetails ein.",
        );
      }
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
    await validateEditableSymptomInputs(completeSymptoms, patientData);
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
