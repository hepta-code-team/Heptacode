import { useState } from "react";
import { CircleHelp } from "lucide-react";
import Modal from "../../components/Modal";
import type { MeasurementConfig } from "./symptoms.constants";

interface PainScaleSelectorProps {
  config: MeasurementConfig;
  value: number;
  onValueChange: (value: number) => void;
}

export default function PainScaleSelector({ config, value, onValueChange }: PainScaleSelectorProps) {
  const [isScaleInfoOpen, setIsScaleInfoOpen] = useState(false);

  const getScaleColor = (level: number) => {
    const colors = ["#ACED40", "#BDE635", "#CAE63C", "#D1DB42", "#FACC15", "#F5C147", "#FB923C", "#F97316", "#EF4444", "#DC2626"];
    return colors[level - 1] || colors[0];
  };

  const getButtonColor = (buttonLevel: number, selectedLevel: number) => {
    return buttonLevel > selectedLevel ? "#E5E7EB" : getScaleColor(buttonLevel);
  };

  const infoButton = (
    <button
      type="button"
      onClick={() => setIsScaleInfoOpen(true)}
      className="inline-flex size-6 items-center justify-center rounded-full text-[#486284] transition-all hover:bg-[#dde3ea]"
      aria-label={`Informationen zu ${config.title}`}
    >
      <CircleHelp className="size-4" aria-hidden="true" />
    </button>
  );

  const infoModal = (
    <Modal
      isOpen={isScaleInfoOpen}
      onClose={() => setIsScaleInfoOpen(false)}
      title={config.infoTitle ?? config.title}
      subtitle={config.infoText}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3 text-sm font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e]">
        {config.type !== "temperature" ? (
          <>
            <p><strong>1-3:</strong> leichte Beschwerden. Spürbar, aber meist noch gut auszuhalten.</p>
            <p><strong>4-6:</strong> mittelstarke Beschwerden. Sie stören deutlich, Alltag oder Bewegung sind eingeschränkt.</p>
            <p><strong>7-8:</strong> starke Beschwerden. Sie sind sehr belastend und sollten ärztlich abgeklärt werden.</p>
            <p><strong>9-10:</strong> extrem starke Beschwerden. Kaum auszuhalten, besonders ernst zu nehmen, vor allem zusammen mit Warnzeichen.</p>
            <p>
              Wichtig: Die Zahl beschreibt Ihre persönliche Wahrnehmung. Eine hohe Zahl bedeutet nicht automatisch Notaufnahme.
              Entscheidend sind zusätzlich Dauer, Art der Beschwerde und Warnsymptome.
            </p>
          </>
        ) : (
          <>
            <p>Wählen Sie die gemessene oder geschätzte Temperatur.</p>
            <p>Sehr hohes Fieber, Fieber über mehrere Tage oder Fieber mit starkem Krankheitsgefühl sollte ärztlich abgeklärt werden.</p>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsScaleInfoOpen(false)}
          className="mt-2 w-full rounded-[14px] bg-[#486284] px-5 py-3 text-white transition-all hover:bg-[#3a4d68]"
        >
          Verstanden
        </button>
      </div>
    </Modal>
  );

  if (config.type === "temperature") {
    const temperatureOptions = [38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5];

    const getTemperatureColor = (temperature: number) => {
      const colors = ["#ffd53e", "#ffb826", "#ffa144", "#FB923C", "#F97316", "#ff5141", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D"];
      const index = Math.min(Math.max(Math.round((temperature - 38) / 0.5), 0), colors.length - 1);
      return colors[index];
    };

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base">
              {config.title}
            </p>
            {infoButton}
          </div>

          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl text-[#486284]">
            {value >= 42.5 ? ">42" : value.toFixed(1)} {config.unit}
          </p>
        </div>

        <div className="flex gap-1 mb-2">
          {temperatureOptions.map((temperature) => {
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
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between">
          <span className="text-xs text-gray-500">{config.minLabel}</span>
          <span className="text-xs text-gray-500">{config.maxLabel}</span>
        </div>

        {infoModal}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base">
            {config.title}
          </p>
          {infoButton}
        </div>

        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl" style={{ color: getScaleColor(value) }}>
          {value}/10
        </p>
      </div>

      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onValueChange(level)}
            className="flex-1 h-12 rounded-lg transition-all hover:opacity-80 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-white text-sm"
            style={{ backgroundColor: getButtonColor(level, value) }}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <span className="text-xs text-gray-500">{config.minLabel}</span>
        <span className="text-xs text-gray-500">{config.maxLabel}</span>
      </div>

      {infoModal}
    </div>
  );
}
