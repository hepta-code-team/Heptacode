import { useState } from "react";
import { Mic } from "lucide-react";
import { BODY_REGIONS, MAX_SYMPTOMS, type BodyRegion } from "./symptoms.constants";

type OtherRegion = { id: "other"; name: string };

interface SymptomButtonGridProps {
  onRegionSelect: (regionName: string, side?: string) => void;
  selectedRegions?: string[];
  showOtherOption?: boolean;
  onOtherClick?: () => void;
}

export default function SymptomButtonGrid({
  onRegionSelect,
  selectedRegions = [],
  showOtherOption = false,
  onOtherClick,
}: SymptomButtonGridProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const handleRegionClick = (region: BodyRegion | OtherRegion) => {
    if (region.id === "other") {
      onOtherClick?.();
      return;
    }

    if ("options" in region && region.options?.length) {
      setExpandedRegion(expandedRegion === region.id ? null : region.id);
    } else {
      onRegionSelect(region.name);
      setExpandedRegion(null);
    }
  };

  const handleOptionClick = (regionName: string, option: string) => {
    onRegionSelect(regionName, option);
    setExpandedRegion(null);
  };

  const isRegionSelected = (regionName: string) => {
    return selectedRegions.some((r) => r.includes(regionName));
  };

  const otherRegion: OtherRegion = { id: "other", name: "Symptome umschreiben" };
  const regions: Array<BodyRegion | OtherRegion> = showOtherOption
    ? [...BODY_REGIONS, otherRegion]
    : BODY_REGIONS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {regions.map((region) => (
        <div key={region.id} className="relative">
          <button
            onClick={() => handleRegionClick(region)}
            className={`w-full bg-[#eff2f6] rounded-[16px] p-4 h-[120px] flex items-center justify-center text-center transition-all relative ${
              isRegionSelected(region.name)
                ? "ring-4 ring-[#486284]"
                : "hover:bg-[#dde3ea]"
            }`}
            disabled={selectedRegions.length >= MAX_SYMPTOMS && !isRegionSelected(region.name)}
          >
            {"icon" in region && (
              <img
                src={region.icon}
                alt=""
                className="absolute left-6 top-1/2 size-20 -translate-y-1/2 object-contain"
                aria-hidden="true"
              />
            )}
            {region.id === "other" && (
              <Mic className="absolute left-8 top-1/2 size-10 -translate-y-1/2 text-[#828b93]" aria-hidden="true" />
            )}
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-base px-24"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {region.name}
            </p>
            {"options" in region && region.options?.length && (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#486284]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>

          {expandedRegion === region.id && "options" in region && region.options?.length && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border-2 border-[#486284] rounded-[12px] shadow-lg overflow-hidden">
              {region.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionClick(region.name, option)}
                  className="w-full p-3 text-left hover:bg-[#eff2f6] transition-all border-b border-gray-200 last:border-b-0"
                >
                  <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm text-[#3e3e3e]">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
