import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import PainScaleSelector from "./PainScaleSelector";
import DurationSelector from "./DurationSelector";
import { getMeasurementConfigByType } from "./symptoms.constants";
import type { SymptomDraft } from "../../types/assessment";

interface SymptomDetailsFormProps {
  symptom: SymptomDraft;
  onUpdate: (field: keyof SymptomDraft, value: SymptomDraft[keyof SymptomDraft]) => void;
  onNameUpdate: (name: string) => void;
  onRemove: () => void;
  showDurationError?: boolean;
}

export default function SymptomDetailsForm({
  symptom,
  onUpdate,
  onNameUpdate,
  onRemove,
  showDurationError = false,
}: SymptomDetailsFormProps) {
  const measurementConfig = getMeasurementConfigByType(symptom.measurementType);
  const symptomName = symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const detailsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDetails) {
      detailsInputRef.current?.focus();
      detailsInputRef.current?.select();
    }
  }, [isEditingDetails]);

  return (
    <div className="bg-[#eff2f6] shadow-md rounded-[16px] p-5 relative">
      {/* Top-right remove button */}
      <button
        onClick={onRemove}
        className="absolute top-4 right-4 text-app-text-primary hover:text-app-text-primary-strong transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mb-4 flex min-h-9 items-center pr-8">
        {symptom.isNameEditable && isEditingName ? (
          <>
            <input
              ref={nameInputRef}
              type="text"
              value={symptomName}
              onChange={(event) => onNameUpdate(event.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              aria-label="Symptomname bearbeiten"
              className="min-w-0 flex-1 border-0 border-b-2 border-[#486284] bg-transparent px-0 py-1 font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg outline-none"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsEditingName(false)}
              className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-white"
              aria-label="Symptomname speichern"
            >
              <Check className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <p
              className="min-w-0 break-words font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {symptomName}
            </p>
            {symptom.isNameEditable && (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-white"
                aria-label="Symptomname bearbeiten"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {symptom.details !== undefined && (
        <div className="mb-4 flex min-h-8 items-center gap-2 pr-8">
          {isEditingDetails ? (
            <>
              <input
                ref={detailsInputRef}
                type="text"
                value={symptom.details ?? ""}
                onChange={(event) => onUpdate("details", event.target.value)}
                onBlur={() => setIsEditingDetails(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Zusatzdetails bearbeiten"
                className="min-w-0 flex-1 border-0 border-b-2 border-[#486284] bg-transparent px-0 py-1 text-sm font-medium leading-relaxed text-app-text-body outline-none"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsEditingDetails(false)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-white"
                aria-label="Zusatzdetails speichern"
              >
                <Check className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <p className="min-w-0 break-words text-sm font-medium leading-relaxed text-app-text-body">
                {symptom.details}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingDetails(true)}
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-white"
                aria-label="Zusatzdetails bearbeiten"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      <PainScaleSelector
        config={measurementConfig}
        value={symptom.measurementValue}
        onValueChange={(value) => onUpdate("measurementValue", value)}
      />

      <DurationSelector
        selectedDuration={symptom.duration}
        onDurationChange={(duration) => onUpdate("duration", duration)}
        showError={showDurationError && !symptom.duration}
      />
    </div>
  );
}
