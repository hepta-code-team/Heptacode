import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, Mic, X } from "lucide-react";
import PageShell from "../components/PageShell";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { EMERGENCY_SYMPTOM_OPTIONS } from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom } from "../types/assessment";

export default function SymptomSelectionPage() {
  const navigate = useNavigate();
  const { selectedSymptoms: contextSymptoms, setSelectedSymptoms: setContextSymptoms } = useAssessment();

  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>(contextSymptoms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symptomText, setSymptomText] = useState("");

  const handleRegionSelect = (regionName: string, side?: string) => {
    if (side && EMERGENCY_SYMPTOM_OPTIONS.includes(side)) {
      navigate("/result?emergency=true");
      return;
    }

    const symptomKey = side ? `${regionName} (${side})` : regionName;
    const alreadySelected = selectedSymptoms.some((s) => {
      const existingKey = s.side ? `${s.region} (${s.side})` : s.region;
      return existingKey === symptomKey;
    });

    if (alreadySelected) {
      setSelectedSymptoms((symptoms) =>
        symptoms.filter((s) => {
          const existingKey = s.side ? `${s.region} (${s.side})` : s.region;
          return existingKey !== symptomKey;
        }),
      );
      return;
    }

    if (selectedSymptoms.length < 3) {
      const newSymptom: SelectedSymptom = { region: regionName, side };
      setSelectedSymptoms([...selectedSymptoms, newSymptom]);
    }
  };

  const removeSymptom = (index: number) => {
    setSelectedSymptoms(selectedSymptoms.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    setContextSymptoms(selectedSymptoms);
    navigate("/symptom-details");
  };

  return (
    <PageShell
      title="Wo haben Sie Beschwerden?"
      subtitle={`Wählen Sie bis zu 3 Körperregionen aus (${selectedSymptoms.length}/3 ausgewählt)`}
      onBack={() => navigate("/patient-data")}
    >
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {selectedSymptoms.map((symptom, index) => (
            <div
              key={index}
              className="bg-[#486284] text-white rounded-full px-4 py-2 flex items-center gap-2"
            >
              <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm">
                {symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}
              </span>
              <button
                onClick={() => removeSymptom(index)}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SymptomButtonGrid
        onRegionSelect={handleRegionSelect}
        selectedRegions={selectedSymptoms.map(s => s.side ? `${s.region} (${s.side})` : s.region)}
        showOtherOption={true}
        onOtherClick={() => setIsModalOpen(true)}
      />

      <div className="mt-6 mb-6 flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={selectedSymptoms.length === 0}
        >
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Weiter
          </p>
        </Button>
      </div>

      {/* Symptom Description Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSymptomText("");
        }}
        title="Beschreiben Sie Ihre Symptome"
        subtitle="Bitte beschreiben Sie Ihre Symptome in 1-2 Sätzen. Nennen Sie dabei die Schmerzintensität von 1-10 und die Dauer der jeweiligen Symptome."
      >
        <textarea
          value={symptomText}
          onChange={(e) => setSymptomText(e.target.value)}
          placeholder="z.B. Ich habe seit 3 Tagen starke Kopfschmerzen (7/10) und leichte Übelkeit."
          className="w-full h-40 bg-[#eff2f6] rounded-[16px] p-4 resize-none border-none outline-none focus:ring-2 focus:ring-[#486284] font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-base"
          style={{ fontVariationSettings: "'opsz' 14" }}
        />

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => {}}
            className="bg-[#486284] text-white rounded-full w-16 h-16 hover:bg-[#3a4d68] transition-all shadow-lg flex items-center justify-center"
          >
            <Mic className="size-8" aria-hidden="true" />
          </button>

          <button
            onClick={() => navigate("/symptom-details")}
            className="bg-[#486284] text-white rounded-full w-16 h-16 hover:bg-[#3a4d68] transition-all shadow-lg flex items-center justify-center"
          >
            <Check className="size-8" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}
