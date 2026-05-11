import PainScaleSelector from "./PainScaleSelector";
import DurationSelector from "./DurationSelector";
import { getMeasurementConfig } from "./symptoms.constants";
import type { Symptom } from "../../types/assessment";

interface SymptomDetailsFormProps {
  symptom: Symptom;
  onUpdate: (field: keyof Symptom, value: Symptom[keyof Symptom]) => void;
  onRemove: () => void;
  showDurationError?: boolean;
}

export default function SymptomDetailsForm({
  symptom,
  onUpdate,
  onRemove,
  showDurationError = false,
}: SymptomDetailsFormProps) {
  const measurementConfig = getMeasurementConfig(symptom.region, symptom.side);

  return (
    <div className="bg-[#eff2f6] rounded-[16px] p-5 relative">
      {/* X Button oben rechts */}
      <button
        onClick={onRemove}
        className="absolute top-4 right-4 text-[#486284] hover:text-[#3a4d68] transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <p
        className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-4 pr-8"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}
      </p>

      <PainScaleSelector
        config={measurementConfig}
        value={symptom.measurementValue}
        onValueChange={(value) => onUpdate("measurementValue", value)}
      />

      <DurationSelector
        selectedDuration={symptom.duration}
        onDurationChange={(duration) => onUpdate("duration", duration)}
        showError={showDurationError && symptom.duration === ""}
      />
    </div>
  );
}
