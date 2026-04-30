import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PageShell from "../components/PageShell";
import SymptomDetailsForm from "../features/symptoms/SymptomDetailsForm";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import type { Symptom } from "../types/assessment";

export default function SymptomDetailsPage() {
  const navigate = useNavigate();
  const { selectedSymptoms, symptomDetails: contextDetails, setSymptomDetails: setContextDetails } = useAssessment();

  // Initialize symptomDetails from selectedSymptoms
  const [symptomDetails, setSymptomDetails] = useState<Symptom[]>(() => {
    // If context already has details, use them
    if (contextDetails.length > 0) {
      return contextDetails;
    }

    // Otherwise, create new details from selectedSymptoms
    return selectedSymptoms.map((s, idx) => ({
      id: `symptom-${Date.now()}-${idx}`,
      region: s.region,
      side: s.side || "",
      painLevel: 5,
      duration: "",
      active: true,
    }));
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Redirect if no symptoms selected
  useEffect(() => {
    if (selectedSymptoms.length === 0) {
      navigate("/symptom-selection");
    }
  }, [selectedSymptoms, navigate]);

  const updateSymptom = (index: number, field: keyof Symptom, value: Symptom[keyof Symptom]) => {
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
      updated[inactiveIndex] = {
        ...updated[inactiveIndex],
        region: regionName,
        side: side || "",
        painLevel: 5,
        duration: "",
        active: true,
      };
      setSymptomDetails(updated);
    }

    setIsAddModalOpen(false);
  };

  const handleContinue = () => {
    // Save only active symptoms to context
    const activeSymptoms = symptomDetails.filter(s => s.active);
    setContextDetails(activeSymptoms);
    navigate("/result");
  };

  return (
    <PageShell
      title="Details zu Ihren Beschwerden"
      subtitle="Bewerten Sie bitte Ihre Schmerzen und geben Sie die Dauer an."
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
              />
            ) : (
              <div className="bg-[#eff2f6] rounded-[16px] p-5">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full flex items-center justify-center py-12 hover:bg-[#dde3ea] transition-all rounded-[16px]"
                >
                  <svg className="w-16 h-16 text-[#486284]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 mb-6 flex justify-end">
        <Button onClick={handleContinue}>
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
