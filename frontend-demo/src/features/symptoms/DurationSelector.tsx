import { DURATIONS } from "./symptoms.constants";

interface DurationSelectorProps {
  selectedDuration: string;
  onDurationChange: (durationId: string) => void;
}

export default function DurationSelector({ selectedDuration, onDurationChange }: DurationSelectorProps) {
  return (
    <div>
      <p
        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base mb-2"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Seit wann?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DURATIONS.map((duration) => (
          <button
            key={duration.id}
            onClick={() => onDurationChange(duration.id)}
            className={`p-3 rounded-[12px] transition-all ${
              selectedDuration === duration.id
                ? "bg-[#486284] text-white"
                : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
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
