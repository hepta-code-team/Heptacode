import { useState } from "react";
import { Mic } from "lucide-react";
import { BODY_REGIONS, MAX_SYMPTOMS, type BodyRegion } from "./symptoms.constants";

type OtherRegion = { id: "other"; name: string };
type InlineOption = {
  id: string;
  name: string;
  icon: string;
  parentName: string;
  option: string;
  isInlineOption: true;
};
type SymptomGridItem = BodyRegion | OtherRegion | InlineOption;

const SOFT_HYPHEN = "­";
const LONG_WORD_CHUNK_SIZE = 10;

function hyphenateLongWords(label: string) {
  return label
    .split(/(\s+)/)
    .map((part) => {
      if (/\s+/.test(part) || part.length <= LONG_WORD_CHUNK_SIZE + 4) {
        return part;
      }

      return part.replace(new RegExp(`(.{${LONG_WORD_CHUNK_SIZE}})(?=.)`, "g"), `$1${SOFT_HYPHEN}`);
    })
    .join("");
}

export function renderBreakableLabel(label: string) {
  if (!label.includes("/")) {
    return hyphenateLongWords(label);
  }

  return label.split("/").map((part, index, parts) => (
    <span key={`${part}-${index}`}>
      {hyphenateLongWords(part)}
      {index < parts.length - 1 && (
        <>
          /
          <wbr />
        </>
      )}
    </span>
  ));
}

interface SymptomButtonGridProps {
  onRegionSelect: (regionName: string, side?: string) => void;
  regions?: BodyRegion[];
  selectedRegions?: string[];
  showOtherOption?: boolean;
  onOtherClick?: () => void;
  inlineOptions?: boolean;
  disableSelectedRegions?: boolean;
}

export default function SymptomButtonGrid({
  onRegionSelect,
  regions: providedRegions,
  selectedRegions = [],
  showOtherOption = false,
  onOtherClick,
  inlineOptions = false,
  disableSelectedRegions = false,
}: SymptomButtonGridProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const handleRegionClick = (region: SymptomGridItem) => {
    if (region.id === "other") {
      onOtherClick?.();
      return;
    }

    if ("isInlineOption" in region) {
      onRegionSelect(region.parentName, region.option);
      setExpandedRegion(null);
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
    const symptomKey = `${regionName} (${option})`;

    if (disableSelectedRegions && selectedRegions.includes(symptomKey)) {
      return;
    }

    onRegionSelect(regionName, option);
    setExpandedRegion(null);
  };

  const isRegionSelected = (regionName: string) => {
    return selectedRegions.some((r) => r.includes(regionName));
  };

  const isItemSelected = (region: SymptomGridItem) => {
    if ("isInlineOption" in region) {
      return selectedRegions.includes(`${region.parentName} (${region.option})`);
    }

    return isRegionSelected(region.name);
  };


  const isItemExactSelected = (region: SymptomGridItem) => {
    if ("isInlineOption" in region) {
      return selectedRegions.includes(`${region.parentName} (${region.option})`);
    }

    if ("options" in region && region.options?.length) {
      return false;
    }

    return selectedRegions.includes(region.name);
  };

  const otherRegion: OtherRegion = { id: "other", name: "Symptome umschreiben" };
  const baseRegions = providedRegions ?? BODY_REGIONS;
  const preparedRegions: SymptomGridItem[] = inlineOptions
    ? baseRegions.flatMap((region) => {
        if (region.id === "verbrennung") {
          return [region];
        }

        if (!region.options?.length) {
          return [region];
        }

        return region.options.map((option) => ({
          id: `${region.id}-${option}`,
          name: option,
          icon: region.icon,
          parentName: region.name,
          option,
          isInlineOption: true as const,
        }));
      })
    : baseRegions;
  const regions: SymptomGridItem[] = showOtherOption
    ? [...preparedRegions, otherRegion]
    : preparedRegions;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {regions.map((region) => {
        const isSelectedItemDisabled = disableSelectedRegions && isItemExactSelected(region);

        return (
        <div key={region.id} className="relative">
          <button
            onClick={() => handleRegionClick(region)}
            className={`w-full bg-[#eff2f6] shadow-md rounded-[16px] p-4 h-[120px] flex items-center justify-start text-left transition-all relative ${
              isItemSelected(region)
                ? "ring-2 ring-[#486284]"
                : "hover:bg-[#dde3ea]"
            }`}
            disabled={isSelectedItemDisabled || (selectedRegions.length >= MAX_SYMPTOMS && !isItemSelected(region))}
            aria-label={region.name}
          >
            {"icon" in region && (
              <img
                src={region.icon}
                alt=""
                className="absolute left-4 top-1/2 size-16 -translate-y-1/2 object-contain md:left-5 md:size-18 lg:left-6 lg:size-20"
                aria-hidden="true"
              />
            )}
            {region.id === "other" && (
              <Mic className="absolute left-7 top-1/2 size-10 -translate-y-1/2 text-app-text-muted md:left-8" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 pl-20 pr-7 md:pl-24">
              {"isInlineOption" in region && (
                <p
                  className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs mb-0.5"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {region.parentName}
                </p>
              )}
              <p
                className="hyphens-auto break-words font-['DM_Sans:Bold',sans-serif] font-bold leading-tight text-app-text-body text-base"
                lang="de"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {renderBreakableLabel(region.name)}
              </p>
            </div>
            {"options" in region && region.options?.length && (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-app-text-primary"
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
              {region.options.map((option) => {
                const optionKey = `${region.name} (${option})`;
                const isSelectedOptionDisabled = disableSelectedRegions && selectedRegions.includes(optionKey);

                return (
                  <div key={option} className="border-b border-gray-200 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => handleOptionClick(region.name, option)}
                      disabled={isSelectedOptionDisabled}
                      className={`flex w-full items-center justify-between gap-3 p-3 text-left transition-all ${
                        isSelectedOptionDisabled
                          ? "cursor-not-allowed bg-[#eff2f6] text-app-text-muted"
                          : "hover:bg-[#eff2f6]"
                      }`}
                    >
                      <span className="hyphens-auto break-words font-['DM_Sans:Medium',sans-serif] font-medium text-sm text-app-text-body" lang="de">
                        {renderBreakableLabel(option)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}