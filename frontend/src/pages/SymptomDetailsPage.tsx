import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import PageShell from "../components/PageShell";
import SymptomDetailsForm from "../features/symptoms/SymptomDetailsForm";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import {
  getMeasurementConfig,
  getMeasurementConfigByType,
  MAX_SYMPTOMS,
} from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom, Symptom, SymptomDraft, TriageSymptom } from "../types/assessment";
import { handleSubmitAssessment } from "../features/symptoms/handleSubmitAssessment";
import { LoaderCircle, X } from "lucide-react";

interface SymptomDetailsRouteState {
  extractedSymptoms?: TriageSymptom[];
}

export default function SymptomDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as SymptomDetailsRouteState | null;
  const hasRouteExtractedSymptoms = Boolean(routeState?.extractedSymptoms?.length);
  const {
    patientData,
    selectedSymptoms,
    symptomDetails: contextDetails,
    setSymptomDetails,
    isEvaluating,
    submitAssessment,
  } = useAssessment();

  const createSymptomDetails = (region: string, side: string | undefined, index: number): SymptomDraft => {
    const measurementConfig = getMeasurementConfig(region);

    return {
      id: `symptom-${Date.now()}-${index}`,
      region,
      side,
      measurementType: measurementConfig.type,
      measurementValue: measurementConfig.defaultValue,
      active: true,
    };
  };

  const createEmptySymptom = (index: number): SymptomDraft => ({
    id: `symptom-placeholder-${Date.now()}-${index}`,
    region: "",
    side: undefined,
    measurementType: "pain",
    measurementValue: 5,
    active: false,
  });

  const normalizeSymptom = (
    symptom: SelectedSymptom | Symptom | TriageSymptom,
    index: number,
    isNameEditable = false,
  ): SymptomDraft => {
    const inferredMeasurementConfig = getMeasurementConfig(symptom.region);
    const measurementType = "measurementType" in symptom && symptom.measurementType
      ? symptom.measurementType
      : inferredMeasurementConfig.type;
    const measurementConfig = getMeasurementConfigByType(measurementType);

    return {
      ...symptom,
      id: "id" in symptom ? symptom.id : `symptom-${Date.now()}-${index}`,
      active: "active" in symptom ? symptom.active : true,
      measurementType,
      measurementValue: "measurementValue" in symptom && typeof symptom.measurementValue === "number"
        ? symptom.measurementValue
        : measurementConfig.defaultValue,
      isNameEditable,
    };
  };

  const buildInitialSymptomDetails = (): SymptomDraft[] => {
    const activeSymptoms =
      routeState?.extractedSymptoms && routeState.extractedSymptoms.length > 0
        ? routeState.extractedSymptoms.map((symptom, index) => normalizeSymptom(symptom, index, true))
        : contextDetails.length > 0
          ? contextDetails.map((symptom, index) => normalizeSymptom(symptom, index))
          : selectedSymptoms.map((symptom, index) => normalizeSymptom(symptom, index));

    const placeholders = Array.from(
      { length: Math.max(0, MAX_SYMPTOMS - activeSymptoms.length) },
      (_, index) => createEmptySymptom(index),
    );

    return [...activeSymptoms.slice(0, MAX_SYMPTOMS), ...placeholders];
  };

  const [symptomDetails, setLocalSymptomDetails] = useState<SymptomDraft[]>(buildInitialSymptomDetails);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSymptomDetails(symptomDetails.filter((symptom) => symptom.active) as Symptom[]);
  }, [symptomDetails, setSymptomDetails]);

  useEffect(() => {
    if (selectedSymptoms.length === 0 && contextDetails.length === 0 && !hasRouteExtractedSymptoms) {
      navigate("/symptom-selection");
    }
  }, [contextDetails.length, hasRouteExtractedSymptoms, selectedSymptoms.length, navigate]);

  const updateSymptom = (index: number, field: keyof SymptomDraft, value: SymptomDraft[keyof SymptomDraft]) => {
    const updated = [...symptomDetails];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSymptomDetails(updated);
  };

  const updateSymptomName = (index: number, name: string) => {
    const updated = [...symptomDetails];
    updated[index] = { ...updated[index], region: name, side: undefined };
    setLocalSymptomDetails(updated);
  };

  const toggleSymptomActive = (index: number) => {
    const updated = [...symptomDetails];
    updated[index] = { ...updated[index], active: !updated[index].active };
    setLocalSymptomDetails(updated);
  };

  const handleAddSymptom = (regionName: string, side?: string) => {
    const inactiveIndex = symptomDetails.findIndex((symptom) => !symptom.active);

    if (inactiveIndex !== -1) {
      const updated = [...symptomDetails];
      updated[inactiveIndex] = createSymptomDetails(regionName, side, inactiveIndex);
      setLocalSymptomDetails(updated);
    }

    setIsAddModalOpen(false);
  };

  const handleContinue = () => {
    setSymptomDetails(symptomDetails.filter((symptom) => symptom.active) as Symptom[]);

    void handleSubmitAssessment({
      symptomDetails,
      patientData: patientData ?? undefined,
      submitAssessment,
      navigate,
      setShowValidationErrors,
      setSubmitError,
      setIsSubmitting,
    });
  };

  const isAssessmentSubmitting = isSubmitting || isEvaluating;
  const canContinue = symptomDetails
    .filter((symptom) => symptom.active)
    .every((symptom) => {
      const config = getMeasurementConfigByType(symptom.measurementType);
      return symptom.region.trim().length > 0 && symptom.measurementValue >= config.min && symptom.measurementValue <= config.max;
    });

  return (
    <PageShell
      title="Details zu Ihren Beschwerden"
      subtitle="Bewerten Sie bitte die passende Stärke oder Messgröße und geben Sie die Dauer an."
      onBack={() => navigate("/symptom-selection")}
    >
      <div className="flex flex-col gap-6">
        {symptomDetails.map((symptom, index) => (
          <div key={symptom.id}>
            {symptom.active ? (
              <SymptomDetailsForm
                symptom={symptom}
                onUpdate={(field, value) => updateSymptom(index, field, value)}
                onNameUpdate={(name) => updateSymptomName(index, name)}
                onRemove={() => toggleSymptomActive(index)}
                showDurationError={showValidationErrors}
              />
            ) : (
              <div className="bg-[#eff2f6] rounded-[16px] p-5">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full flex items-center justify-center py-12 hover:bg-[#dde3ea] transition-all rounded-[16px]"
                >
                  <svg className="w-16 h-16 text-app-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 mb-3 flex justify-end">
        <Button onClick={handleContinue} disabled={!canContinue || isAssessmentSubmitting}>
          <span
            className="flex items-center justify-center gap-2 font-['DM_Sans:Bold',sans-serif] font-bold text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
            aria-live="polite"
          >
            {isAssessmentSubmitting ? "Angaben werden ausgewertet..." : "Weiter"}
            {isAssessmentSubmitting && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
          </span>
        </Button>
      </div>

      {submitError && (
        <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {submitError}
        </div>
      )}



      <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Symptom hinzufügen"
          subtitle="Wählen Sie eine Körperregion aus"
      >
        <button
            type="button"
            onClick={() => setIsAddModalOpen(false)}
            className="absolute right-8 top-9 rounded-full p-2 text-slate-500 hover:bg-slate-100
            hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Modal schließen"
        >
          <X className="h-7 w-7" aria-hidden="true" />
        </button>
        <SymptomButtonGrid onRegionSelect={handleAddSymptom} />
      </Modal>
    </PageShell>
  );
}