interface PainScaleSelectorProps {
  painLevel: number;
  onPainLevelChange: (level: number) => void;
}

export default function PainScaleSelector({ painLevel, onPainLevelChange }: PainScaleSelectorProps) {
  const getPainColor = (level: number) => {
    const colors = [
      "#ACED40", // 1 - Hellgrün
      "#BDE635", // 2 - mittelgrün
      "#CAE63C", // 3 - dunkelgrün
      "#D1DB42", // 4 - gelbgrün
      "#FACC15", // 5 - Gelb
      "#F5C147", // 6 - Helles Gelb-Orange
      "#FB923C", // 7 - Orange
      "#F97316", // 8 - Kräftiges Orange
      "#EF4444", // 9 - Rot
      "#DC2626", // 10 - Dunkelrot
    ];
    return colors[level - 1] || colors[0];
  };

  const getButtonColor = (buttonLevel: number, selectedLevel: number) => {
    if (buttonLevel > selectedLevel) {
      return "#E5E7EB"; // Hellgrau für unausgewählt
    }
    return getPainColor(buttonLevel);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Schmerzstärke
        </p>
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-2xl"
          style={{
            fontVariationSettings: "'opsz' 14",
            color: getPainColor(painLevel),
          }}
        >
          {painLevel}/10
        </p>
      </div>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            onClick={() => onPainLevelChange(level)}
            className="flex-1 h-12 rounded-lg transition-all hover:opacity-80 flex items-center justify-center font-['DM_Sans:Bold',sans-serif] font-bold text-white text-sm"
            style={{
              backgroundColor: getButtonColor(level, painLevel),
              fontVariationSettings: "'opsz' 14",
            }}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Leicht</span>
        <span className="text-xs text-gray-500">Sehr stark</span>
      </div>
    </div>
  );
}
