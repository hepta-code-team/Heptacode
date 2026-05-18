import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PageShell from "../components/PageShell";
import SymptomDetailsForm from "../features/symptoms/SymptomDetailsForm";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { getMeasurementConfig } from "../features/symptoms/symptoms.constants";
import type { SymptomMeasurementType, TriageSymptom } from "../types/assessment";

type SymptomDraft = TriageSymptom & {
  id: string;
  active: boolean;
  measurementType: SymptomMeasurementType;
};

export default function SymptomDetailsPage() {
  const navigate = useNavigate();
  const { selectedSymptoms, symptomDetails: contextDetails, setSymptomDetails: setContextDetails } = useAssessment();

  const createSymptomDetails = (region: string, side: string | undefined, index: number): SymptomDraft => {
    const measurementConfig = getMeasurementConfig(region, side);

    return {
      id: `symptom-${Date.now()}-${index}`,
      region,
      side,
      measurementType: measurementConfig.type,
      painLevel: measurementConfig.defaultValue,
      active: true,
    };
  };

  const normalizeSymptom = (symptom: TriageSymptom, index: number): SymptomDraft => {
    const measurementConfig = getMeasurementConfig(symptom.region, symptom.side);

    return {
      ...symptom,
      id: `symptom-${Date.now()}-${index}`,
      active: true,
      measurementType: measurementConfig.type,
      painLevel: Number.isFinite(symptom.painLevel)
        ? symptom.painLevel
        : measurementConfig.defaultValue,
    };
  };

  // Initialize symptomDetails from selectedSymptoms
  const [symptomDetails, setSymptomDetails] = useState<SymptomDraft[]>(() => {
    // If context already has details, use them
    if (contextDetails.length > 0) {
      return contextDetails.map(normalizeSymptom);
    }

    // Otherwise, create new details from selectedSymptoms
    return selectedSymptoms.map((s, idx) => createSymptomDetails(s.region, s.side, idx));
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Redirect if no symptoms selected
  useEffect(() => {
    if (selectedSymptoms.length === 0) {
      navigate("/symptom-selection");
    }
  }, [selectedSymptoms, navigate]);

  const updateSymptom = (index: number, field: keyof SymptomDraft, value: SymptomDraft[keyof SymptomDraft]) => {
    const updated = [...symptomDetails];
    updated[index] = { ...updated[index], [field]: value };
    setSymptomDetails(updated);
  };

  const toggleSymptomActive = (index: number) => {
    const updated = [...symptomDetails];
    updated[index] = { ...updated[index], active: !updated[index].active };
    setSymptomDetails(updated);
  };

  const handleAddSymptom = (regionName: string, side?: string) => {
    const inactiveIndex = symptomDetails.findIndex((s) => !s.active);

    if (inactiveIndex !== -1) {
      const updated = [...symptomDetails];
      updated[inactiveIndex] = createSymptomDetails(regionName, side, inactiveIndex);
      setSymptomDetails(updated);
    }

    setIsAddModalOpen(false);
  };

  const handleContinue = () => {
    const activeSymptoms = symptomDetails.filter(s => s.active);

    if (activeSymptoms.some((symptom) => !symptom.duration)) {
      setShowValidationErrors(true);
      return;
    }

    // Save only active symptoms to context
    setContextDetails(
      activeSymptoms.map((symptom) => ({
        region: symptom.region,
        side: symptom.side,
        painLevel: symptom.painLevel,
        duration: symptom.duration,
      })),
    );
    navigate("/result");
  };

  const canContinue = symptomDetails
    .filter((symptom) => symptom.active)
    .every((symptom) => {
      const config = getMeasurementConfig(symptom.region, symptom.side);
      return (symptom.painLevel ?? 0) >= config.min && (symptom.painLevel ?? 0) <= config.max;
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

      <div className="mt-6 mb-6 flex justify-end">
        <Button onClick={handleContinue} disabled={!canContinue}>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Weiter
          </p>
        </Button>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Symptom hinzufügen"
        subtitle="Wählen Sie eine Körperregion aus"
      >
        <SymptomButtonGrid onRegionSelect={handleAddSymptom} />

        <div className="flex justify-end mt-6">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Abbrechen
            </p>
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
