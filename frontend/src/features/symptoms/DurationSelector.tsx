import { DURATIONS } from "./symptoms.constants";

interface DurationSelectorProps {
  selectedDuration: string;
  onDurationChange: (durationId: string) => void;
  showError?: boolean;
}

export default function DurationSelector({ selectedDuration, onDurationChange, showError = false }: DurationSelectorProps) {
  return (
    <div className="rounded-[14px] transition-all">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p
          className={`font-['DM_Sans:SemiBold',sans-serif] font-semibold text-base ${
            showError ? "text-app-text-danger" : "text-app-text-body"
          }`}
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Seit wann?
        </p>
        {showError && (
          <p className="text-right text-xs font-semibold text-app-text-danger">
            Bitte auswählen
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DURATIONS.map((duration) => (
          <button
            key={duration.id}
            onClick={() => onDurationChange(duration.id)}
            className={`p-3 rounded-[12px] transition-all ${
              selectedDuration === duration.id
                ? "bg-[#486284] text-app-text-on-primary"
                : "bg-white text-app-text-body hover:bg-[#dde3ea]"
            }`}
          >
            <span
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {duration.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
