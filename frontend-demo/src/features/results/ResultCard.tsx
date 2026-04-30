import type { ResultConfig } from "./result.types";

interface ResultCardProps {
  config: ResultConfig;
}

export default function ResultCard({ config }: ResultCardProps) {
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
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-white text-xl"
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
        </p>
      </div>

      <p
        className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm md:text-base leading-relaxed"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {config.description}
      </p>
    </div>
  );
}
