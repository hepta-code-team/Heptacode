import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageShell from "../components/PageShell";
import SymptomDetailsForm from "../features/symptoms/SymptomDetailsForm";
import { handleSubmitAssessment } from "../features/symptoms/handleSubmitAssessment";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { getMeasurementConfig, isAdministrativeSymptom } from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom, Symptom } from "../types/assessment";

function getSymptomSides(symptom: SelectedSymptom) {
  if (symptom.sides && symptom.sides.length > 0) return symptom.sides;
  if (symptom.side) return symptom.side.split(",").map((side) => side.trim()).filter(Boolean);
  return [];
}

function expandSelectedSymptoms(selectedSymptoms: SelectedSymptom[]) {
  return selectedSymptoms.flatMap((symptom) => {
    const sides = getSymptomSides(symptom);

    if (sides.length === 0) {
      return [{ region: symptom.region, side: "" }];
    }

    return sides.map((side) => ({
      region: symptom.region,
      side,
    }));
  });
}

function createSymptomDetails(region: string, side: string, index: number): Symptom {
  const measurementConfig = getMeasurementConfig(region, side);

  return {
    id: `symptom-${Date.now()}-${index}`,
    region,
    side,
    measurementType: measurementConfig.type,
    measurementValue: measurementConfig.defaultValue,
    duration: undefined,
    active: true,
  };
}

export default function SymptomDetailsPage() {
  const navigate = useNavigate();
  const {
    selectedSymptoms,
    symptomDetails: contextDetails,
    setSymptomDetails,
    submitAssessment,
  } = useAssessment();

  const [localDetails, setLocalDetails] = useState<Symptom[]>(() => {
    const expanded = expandSelectedSymptoms(selectedSymptoms).filter(
      (symptom) => !isAdministrativeSymptom(symptom.region, symptom.side)
    );

    return expanded.map((symptom, index) => {
      const existing = contextDetails.find(
        (detail) => detail.region === symptom.region && (detail.side ?? "") === symptom.side
      );

      return existing ?? createSymptomDetails(symptom.region, symptom.side, index);
    });
  });

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedSymptoms.length === 0) {
      navigate("/symptom-selection", { replace: true });
      return;
    }

    const hasOnlyAdministrativeSymptoms = selectedSymptoms.every((symptom) =>
      getSymptomSides(symptom).length > 0
        ? getSymptomSides(symptom).every((side) => isAdministrativeSymptom(symptom.region, side))
        : isAdministrativeSymptom(symptom.region, symptom.side)
    );

    if (hasOnlyAdministrativeSymptoms) {
      setSymptomDetails([]);
      navigate("/result", { replace: true });
    }
  }, [selectedSymptoms, setSymptomDetails, navigate]);

  const updateSymptom = (index: number, field: keyof Symptom, value: Symptom[keyof Symptom]) => {
    setLocalDetails((details) => {
      const updated = [...details];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeSymptom = (index: number) => {
    setLocalDetails((details) => details.filter((_, detailIndex) => detailIndex !== index));
  };

  const handleContinue = async () => {
    setSymptomDetails(localDetails);

    await handleSubmitAssessment({
      symptomDetails: localDetails,
      submitAssessment,
      navigate,
      setShowValidationErrors,
      setSubmitError,
      setIsSubmitting,
    });
  };

  const canContinue =
    localDetails.length > 0 &&
    localDetails.every((symptom) => {
      const config = getMeasurementConfig(symptom.region, symptom.side);
      const value = symptom.measurementValue ?? symptom.painLevel ?? 0;

      return Boolean(symptom.duration) && value >= config.min && value <= config.max;
    });

  return (
    <PageShell
      title="Details zu Ihren Beschwerden"
      subtitle="Beschreiben Sie bitte jede ausgewählte Beschwerde einzeln."
      onBack={() => navigate("/symptom-selection")}
    >
      <div className="flex flex-col gap-6">
        {localDetails.map((symptom, index) => (
          <SymptomDetailsForm
            key={symptom.id}
            symptom={symptom}
            onUpdate={(field, value) => updateSymptom(index, field, value)}
            onRemove={() => removeSymptom(index)}
            showDurationError={showValidationErrors}
          />
        ))}
      </div>

      {submitError && (
        <div className="mt-6 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {submitError}
        </div>
      )}

      <div className="mt-6 mb-6 flex justify-end">
        <Button onClick={() => void handleContinue()} disabled={!canContinue || isSubmitting}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            {isSubmitting ? "Auswertung läuft..." : "Weiter"}
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
