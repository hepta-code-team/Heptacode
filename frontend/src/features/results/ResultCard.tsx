import type { CareLevel, MedicalSpecialty, ResultConfig } from "../../../../shared/result.types";

type ResultCardConfig = ResultConfig & {
  titleSupplement?: string;
};

interface ResultCardProps {
  config: ResultCardConfig;
  careLevel: CareLevel;
  recommendedSpecialty?: MedicalSpecialty;
}

export default function ResultCard({ config, careLevel, recommendedSpecialty }: ResultCardProps) {
  return (
    <div
      className="rounded-[16px] p-5 md:p-6 mb-4"
      style={{ backgroundColor: config.bgColor }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.color }}
        >
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-on-primary text-xl"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            !
          </p>
        </div>
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-xl md:text-2xl"
          style={{ fontVariationSettings: "'opsz' 14", color: config.color }}
        >
          {config.title}
          {config.titleSupplement && (
            <span className="block font-['DM_Sans:Medium',sans-serif] font-light">
              {" "}({config.titleSupplement})
            </span>
          )}
        </p>
      </div>

      <p
        className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm md:text-base leading-relaxed"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {config.description}
        {careLevel === "doctor" && (
          <span className="hidden md:inline">
            {" "}
            Bei weiteren Fragen oder Unsicherheiten kontaktieren Sie die{" "}
            <strong>116 117</strong>.
          </span>
        )}
        {recommendedSpecialty === "psychiatry" && (
          <span className="hidden md:inline">
            {" "}
            Bei akuten Sorgen erreichen Sie die Telefonseelsorge unter{" "}
            <strong>0800 1110111</strong>.
          </span>
        )}
      </p>
    </div>
  );
}
