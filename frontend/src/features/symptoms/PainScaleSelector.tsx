import { useState } from "react";
import { CircleHelp } from "lucide-react";
import Modal from "../../components/Modal";
import type { MeasurementConfig } from "./symptoms.constants";

interface PainScaleSelectorProps {
  config: MeasurementConfig;
  value: number;
  onValueChange: (value: number) => void;
}

const PAIN_SCALE_INFO = [
  { level: 1, label: "Sehr leicht", description: "Kaum spürbarer Schmerz, der im Alltag fast nicht stört." },
  { level: 2, label: "Sehr leicht", description: "Leichter Schmerz, der wahrnehmbar ist, aber gut auszuhalten bleibt." },
  { level: 3, label: "Leicht", description: "Milder Schmerz, der auffällt, aber normale Tätigkeiten kaum einschränkt." },
  { level: 4, label: "Leicht bis mittel", description: "Deutlicher Schmerz, der stört, aber meist noch kontrollierbar ist." },
  { level: 5, label: "Mittel", description: "Mittlerer Schmerz, der Konzentration oder Bewegung merklich beeinträchtigen kann." },
  { level: 6, label: "Mittel bis stark", description: "Störender Schmerz, der Alltagstätigkeiten deutlich erschwert." },
  { level: 7, label: "Stark", description: "Starker Schmerz, der belastend ist und normale Tätigkeiten stark einschränkt." },
  { level: 8, label: "Sehr stark", description: "Sehr starker Schmerz, der kaum zu ignorieren ist und viel Aufmerksamkeit bindet." },
  { level: 9, label: "Extrem stark", description: "Extrem belastender Schmerz, der kaum auszuhalten ist." },
  { level: 10, label: "Maximal", description: "Stärkster vorstellbarer Schmerz." },
];

export default function PainScaleSelector({ config, value, onValueChange }: PainScaleSelectorProps) {
  const [isScaleInfoOpen, setIsScaleInfoOpen] = useState(false);

  const selectedPainInfo = PAIN_SCALE_INFO.find((item) => item.level === value);

  const getScaleColor = (level: number) => {
    const colors = [
      "#ACED40",
      "#BDE635",
      "#CAE63C",
      "#D1DB42",
      "#FACC15",
      "#F5C147",
      "#FB923C",
      "#F97316",
      "#EF4444",
      "#DC2626",
    ];

    return colors[level - 1] || colors[0];
  };

  const getButtonColor = (buttonLevel: number, selectedLevel: number) => {
    if (buttonLevel > selectedLevel) {
      return "#E5E7EB";
    }

    return getScaleColor(buttonLevel);
  };

  if (config.type === "temperature") {
    const temperatureOptions = [38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5];

    const getTemperatureColor = (temperature: number) => {
      const colors = [
        "#ffd53e",
        "#ffb826",
        "#ffa144",
        "#FB923C",
        "#F97316",
        "#ff5141",
        "#DC2626",
        "#B91C1C",
        "#991B1B",
        "#7F1D1D",
      ];

      const index = Math.min(Math.max(Math.round((temperature - 38) / 0.5), 0), colors.length - 1);

      return colors[index];
    };

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-app-text-body text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {config.title}
          </p>

          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl text-app-text-primary"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {value >= 42.5 ? ">42" : value.toFixed(1)} {config.unit}
          </p>
        </div>

        <div className="flex gap-1 mb-2">
          {temperatureOptions.map((temperature) => {
            const isSelected = value === temperature;
            const label = temperature >= 42.5 ? ">42" : temperature.toFixed(1);

            return (
              <button
                key={temperature}
                type="button"
                onClick={() => onValueChange(temperature)}
                className="flex-1 h-12 rounded-lg transition-all hover:opacity-90 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-xs"
                style={{
                  backgroundColor: temperature > value ? "#E5E7EB" : getTemperatureColor(temperature),
                  color: temperature <= 38 ? "#3e3e3e" : "white",
                  fontVariationSettings: "'opsz' 14",
                }}
                aria-pressed={isSelected}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between">
          <span className="text-xs text-app-text-subtle">{config.minLabel}</span>
          <span className="text-xs text-app-text-subtle">{config.maxLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p
              className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-app-text-body text-base"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {config.title}
            </p>

            {config.type === "pain" && (
              <button
                type="button"
                onClick={() => setIsScaleInfoOpen(true)}
                className="inline-flex size-5 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-[#dde3ea] focus:outline-none focus:ring-2 focus:ring-[#486284]/30"
                aria-label="Informationen zur Schmerzskala"
              >
                <CircleHelp className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {config.type === "pain" && selectedPainInfo && (
            <p className="mt-1 text-xs font-semibold text-app-text-subtle">{selectedPainInfo.label}</p>
          )}
        </div>

        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl"
          style={{
            fontVariationSettings: "'opsz' 14",
            color: getScaleColor(value),
          }}
        >
          {value}/10
        </p>
      </div>

      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onValueChange(level)}
            className="flex-1 h-12 rounded-lg transition-all hover:opacity-80 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-on-primary text-sm"
            style={{
              backgroundColor: getButtonColor(level, value),
              fontVariationSettings: "'opsz' 14",
            }}
            aria-label={`Schmerzstärke ${level} von 10`}
            aria-pressed={value === level}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 text-center text-sm font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body">
        <span>sehr leicht</span>
        <span>leicht</span>
        <span>mittel</span>
        <span>stark</span>
      </div>

      <div className="mt-1 flex justify-between">
        <span className="text-xs text-app-text-subtle">{config.minLabel}</span>
        <span className="text-xs text-app-text-subtle">{config.maxLabel}</span>
      </div>

      <Modal
        isOpen={isScaleInfoOpen}
        onClose={() => setIsScaleInfoOpen(false)}
        title="Schmerzskala"
        subtitle="Die Skala hilft einzuschätzen, wie stark der Schmerz aktuell empfunden wird."
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {PAIN_SCALE_INFO.map((item) => (
              <div
                key={item.level}
                className="grid grid-cols-[42px_1fr] gap-3 rounded-[12px] bg-[#eff2f6] p-3"
              >
                <div
                  className="flex size-9 items-center justify-center rounded-[10px] font-['DM_Sans:Bold',sans-serif] font-bold text-white"
                  style={{ backgroundColor: getScaleColor(item.level), fontVariationSettings: "'opsz' 14" }}
                >
                  {item.level}
                </div>

                <div>
                  <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-sm"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsScaleInfoOpen(false)}
            className="mt-2 w-full rounded-[14px] bg-[#486284] px-5 py-3 font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-on-primary transition-all hover:bg-[#3a4d68]"
          >
            Verstanden
          </button>
        </div>
      </Modal>
    </div>
  );
}
