import { validateSymptomDetailInput } from "../../lib/symptomExtractionApi";
import type { PatientData, SymptomDetailPayload, SymptomDraft } from "../../types/assessment";
import {
  BODY_AREA_LABELS,
  BODY_AREA_REGION_IDS,
  BODY_REGIONS,
  type BodyAreaCategory,
} from "./symptoms.constants";

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

const ANATOMICAL_BODY_AREAS: BodyAreaCategory[] = ["head", "neck", "torso", "hips", "arms", "legs"];
const NON_ANATOMICAL_REGION_IDS = new Set(["verbrennung", "schnittwunde"]);

function normalizeForRegionMatch(value: string) {
  return value.toLocaleLowerCase("de-DE");
}

function addGermanAsciiVariants(terms: Set<string>, term: string) {
  terms.add(term);
  terms.add(
    term
      .replaceAll("ä", "ae")
      .replaceAll("ö", "oe")
      .replaceAll("ü", "ue")
      .replaceAll("ß", "ss"),
  );
}

function addTermVariants(terms: Set<string>, value: string) {
  const normalizedValue = normalizeForRegionMatch(value.trim());

  if (!normalizedValue) {
    return;
  }

  addGermanAsciiVariants(terms, normalizedValue);

  normalizedValue
    .split(/[^A-Za-zÄÖÜäöüß]+/)
    .filter((part) => part.length > 2)
    .forEach((part) => {
      addGermanAsciiVariants(terms, part);

      if (part.endsWith("e") && part.length > 4) {
        addGermanAsciiVariants(terms, part.slice(0, -1));
      }
    });
}

function buildRegionTermGroups() {
  return ANATOMICAL_BODY_AREAS.map((category) => {
    const terms = new Set<string>();

    addTermVariants(terms, BODY_AREA_LABELS[category]);

    BODY_REGIONS
      .filter((region) =>
        BODY_AREA_REGION_IDS[category].includes(region.id) &&
        !NON_ANATOMICAL_REGION_IDS.has(region.id),
      )
      .forEach((region) => {
        addTermVariants(terms, region.name);
        region.options?.forEach((option) => addTermVariants(terms, option));
      });

    return Array.from(terms);
  });
}

const REGION_TERM_GROUPS = buildRegionTermGroups();

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textContainsRegionTerm(text: string, term: string) {
  return new RegExp(`(^|[^\\p{L}])${escapeRegex(term)}([^\\p{L}]|$)`, "iu").test(text);
}

function findRegionTermGroups(text: string) {
  const normalizedText = normalizeForRegionMatch(text);

  return REGION_TERM_GROUPS
    .map((terms, index) => terms.some((term) => textContainsRegionTerm(normalizedText, term)) ? index : -1)
    .filter((index) => index !== -1);
}

function hasClearRegionDetailContradiction(symptom: SymptomDraft) {
  const currentRegionGroups = findRegionTermGroups([
    symptom.region,
    symptom.side,
  ].filter(Boolean).join(" "));
  const detailGroups = findRegionTermGroups(symptom.details?.trim() ?? "");

  if (currentRegionGroups.length === 0 || detailGroups.length === 0) {
    return false;
  }

  return detailGroups.every((detailGroup) => !currentRegionGroups.includes(detailGroup));
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

    if (symptom.details?.trim() && hasClearRegionDetailContradiction(symptom)) {
      throw new Error("Bitte prüfen Sie Region und Zusatzdetails. Die Angaben widersprechen sich eindeutig.");
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
