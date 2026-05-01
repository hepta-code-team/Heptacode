import type { MeasurementConfig } from "./symptoms.constants";

interface PainScaleSelectorProps {
  config: MeasurementConfig;
  value: number;
  onValueChange: (value: number) => void;
}

export default function PainScaleSelector({ config, value, onValueChange }: PainScaleSelectorProps) {
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
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {config.title}
          </p>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl text-[#486284]"
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
                className={`flex-1 h-12 rounded-lg transition-all hover:opacity-90 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-xs ${
                  isSelected ? "ring-2 ring-[#486284] ring-offset-2" : ""
                }`}
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
          <span className="text-xs text-gray-500">{config.minLabel}</span>
          <span className="text-xs text-gray-500">{config.maxLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {config.title}
        </p>
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
            onClick={() => onValueChange(level)}
            className="flex-1 h-12 rounded-lg transition-all hover:opacity-80 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-white text-sm"
            style={{
              backgroundColor: getButtonColor(level, value),
              fontVariationSettings: "'opsz' 14",
            }}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">{config.minLabel}</span>
        <span className="text-xs text-gray-500">{config.maxLabel}</span>
      </div>
    </div>
  );
}
