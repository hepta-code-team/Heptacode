import { useState } from "react";
import { CircleHelp } from "lucide-react";
import Modal from "../../components/Modal";
import type { MeasurementConfig } from "./symptoms.constants";

interface PainScaleSelectorProps {
  config: MeasurementConfig;
  value: number;
  onValueChange: (value: number) => void;
}

function ScaleLabels({ config }: { config: MeasurementConfig }) {
  if (!config.scaleLabels?.length) {
    return null;
  }

  return (
    <div
      className="mt-2 grid h-8"
      style={{ gridTemplateColumns: `repeat(${config.scaleLabels.length}, minmax(0, 1fr))` }}
    >
      {config.scaleLabels.map((scaleLabel, index) => (
        <span
          key={`${scaleLabel.value}-${scaleLabel.label}`}
          className={`min-w-0 truncate text-xs text-app-text-subtle ${
            index === 0
              ? "text-left"
              : index === config.scaleLabels!.length - 1
                ? "text-right"
                : "text-center"
          }`}
        >
          {scaleLabel.label}
        </span>
      ))}
    </div>
  );
}

export default function PainScaleSelector({ config, value, onValueChange }: PainScaleSelectorProps) {
  const [isScaleInfoOpen, setIsScaleInfoOpen] = useState(false);

  const getScaleColor = (level: number) => {
    const colors = [
      "#ACED40",
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
    return colors[level] || colors[0];
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
      const index = Math.min(
        Math.max(Math.round((temperature - 38) / 0.5), 0),
        colors.length - 1,
      );

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
                onClick={() => onValueChange(temperature)}
                className="flex-1 h-12 rounded-lg transition-all hover:opacity-90 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-base"
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
        <ScaleLabels config={config} />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
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
              className="inline-flex size-5 -translate-y-0.5 items-center justify-center rounded-full text-app-text-primary transition-all hover:bg-[#dde3ea]"
              aria-label="Informationen zur Schmerzskala"
            >
              <CircleHelp className="size-4" aria-hidden="true" />
            </button>
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
        {Array.from({ length: config.max - config.min + 1 }, (_, index) => config.min + index).map((level) => (
          <button
            key={level}
            onClick={() => onValueChange(level)}
            className="flex-1 h-12 rounded-lg transition-all hover:opacity-80 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-on-primary text-sm"
            style={{
              backgroundColor: getButtonColor(level, value),
              fontVariationSettings: "'opsz' 14",
            }}
          >
            {level}
          </button>
        ))}
      </div>
      <ScaleLabels config={config} />
      <Modal
        isOpen={isScaleInfoOpen}
        onClose={() => setIsScaleInfoOpen(false)}
        title="Numerische Rating-Skala"
        subtitle="Die Schmerzstärke wird hier mit der Numerischen Rating-Skala von 0 bis 10 abgefragt."
        maxWidth="max-w-lg"
      >
        <div className="space-y-3 text-sm font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body">
          <p>0 steht für keinen Schmerz.</p>
          <p>1 bis 3 steht eher für leichte Schmerzen, die noch gut auszuhalten sind.</p>
          <p>4 bis 6 beschreibt mittlere Schmerzen, die deutlich stören oder einschränken.</p>
          <p>7 bis 10 steht für starke bis sehr starke Schmerzen, die sehr belastend sind oder kaum auszuhalten wirken.</p>
          <button
            type="button"
            onClick={() => setIsScaleInfoOpen(false)}
            className="mt-2 w-full rounded-[14px] bg-[#486284] px-5 py-3 text-app-text-on-primary transition-all hover:bg-[#3a4d68]"
          >
            Verstanden
          </button>
        </div>
      </Modal>
    </div>
  );
}
