import { useState } from "react";
import { Check, Mic } from "lucide-react";
import { BODY_REGIONS, type BodyRegion } from "./symptoms.constants";

type SelectionMeta = {
  countsAsMainTile?: boolean;
  mainKey?: string;
  nestedOption?: boolean;
};

type OtherRegion = {
  id: "other";
  name: string;
};

type InlineOption = {
  id: string;
  name: string;
  icon: string;
  parentName: string;
  option: string;
  options?: string[];
  isInlineOption: true;
};

type SymptomGridItem = BodyRegion | OtherRegion | InlineOption;
type SymptomGridItemWithOptions = (BodyRegion | InlineOption) & {
  options: string[];
};

interface SymptomButtonGridProps {
  onRegionSelect: (regionName: string, side?: string, meta?: SelectionMeta) => void;
  regions?: BodyRegion[];
  selectedRegions?: string[];
  showOtherOption?: boolean;
  onOtherClick?: () => void;
  inlineOptions?: boolean;
}

function isInlineOption(region: SymptomGridItem): region is InlineOption {
  return "isInlineOption" in region;
}

function hasOptions(region: SymptomGridItem): region is SymptomGridItemWithOptions {
  return "options" in region && Array.isArray(region.options) && region.options.length > 0;
}

function getInlineMainKey(region: InlineOption) {
  return `${region.parentName} (${region.option})`;
}

function getNestedSelectionKey(region: InlineOption, option: string) {
  return `${region.parentName} (${region.name} - ${option})`;
}

export default function SymptomButtonGrid({
  onRegionSelect,
  regions: providedRegions,
  selectedRegions = [],
  showOtherOption = false,
  onOtherClick,
  inlineOptions = false,
}: SymptomButtonGridProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const handleRegionClick = (region: SymptomGridItem) => {
    if (region.id === "other") {
      onOtherClick?.();
      return;
    }

    if (isInlineOption(region)) {
      if (hasOptions(region)) {
        setExpandedRegion(expandedRegion === region.id ? null : region.id);
        return;
      }

      onRegionSelect(region.parentName, region.option, {
        countsAsMainTile: true,
        mainKey: getInlineMainKey(region),
      });
      return;
    }

    if (hasOptions(region)) {
      setExpandedRegion(expandedRegion === region.id ? null : region.id);
      return;
    }

    onRegionSelect(region.name);
  };

  const handleOptionClick = (region: SymptomGridItemWithOptions, option: string) => {
    if (isInlineOption(region)) {
      onRegionSelect(region.parentName, `${region.name} - ${option}`, {
        countsAsMainTile: true,
        mainKey: getInlineMainKey(region),
        nestedOption: true,
      });
      return;
    }

    onRegionSelect(region.name, option);
  };

  const isItemSelected = (region: SymptomGridItem) => {
    if (isInlineOption(region)) {
      const mainKey = getInlineMainKey(region);

      if (hasOptions(region)) {
        return (
          selectedRegions.includes(mainKey) ||
          selectedRegions.some((selectedRegion) =>
            selectedRegion.startsWith(`${region.parentName} (${region.name} -`)
          )
        );
      }

      return selectedRegions.includes(mainKey);
    }

    if (region.id === "other") {
      return false;
    }

    return (
      selectedRegions.includes(region.name) ||
      selectedRegions.some((selectedRegion) => selectedRegion.startsWith(`${region.name} (`))
    );
  };

  const isOptionSelected = (region: SymptomGridItemWithOptions, option: string) => {
    if (isInlineOption(region)) {
      return selectedRegions.includes(getNestedSelectionKey(region, option));
    }

    return selectedRegions.includes(`${region.name} (${option})`);
  };

  const otherRegion: OtherRegion = {
    id: "other",
    name: "Symptome umschreiben",
  };

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
          options: region.nestedOptions?.[option],
          isInlineOption: true as const,
        }));
      })
    : baseRegions;

  const regions: SymptomGridItem[] = showOtherOption ? [...preparedRegions, otherRegion] : preparedRegions;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {regions.map((region) => {
        const itemSelected = isItemSelected(region);
        const regionHasOptions = hasOptions(region);

        return (
          <div key={region.id} className="relative">
            <button
              type="button"
              onClick={() => handleRegionClick(region)}
              aria-pressed={itemSelected}
              className={`w-full bg-[#eff2f6] rounded-[16px] p-4 h-[120px] flex items-center justify-center text-center transition-all relative ${
                itemSelected ? "ring-4 ring-[#486284]" : "hover:bg-[#dde3ea]"
              }`}
            >
              {"icon" in region && (
                <img
                  src={region.icon}
                  alt=""
                  className="absolute left-5 top-1/2 size-18 -translate-y-1/2 object-contain lg:left-6 lg:size-20"
                  aria-hidden="true"
                />
              )}

              {region.id === "other" && (
                <Mic
                  className="absolute left-8 top-1/2 size-10 -translate-y-1/2 text-[#828b93]"
                  aria-hidden="true"
                />
              )}

              <div className="px-20 lg:px-24">
                {isInlineOption(region) && (
                  <p
                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs mb-0.5"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {region.parentName}
                  </p>
                )}

                <p
                  className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-base"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {region.name}
                </p>
              </div>

              {regionHasOptions && (
                <svg
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#486284] transition-transform ${
                    expandedRegion === region.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {regionHasOptions && expandedRegion === region.id && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border-2 border-[#486284] rounded-[12px] shadow-lg overflow-hidden">
                {region.options.map((option) => {
                  const selected = isOptionSelected(region, option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionClick(region, option)}
                      className={`w-full p-3 text-left transition-all border-b border-gray-200 last:border-b-0 flex items-center justify-between gap-3 ${
                        selected ? "bg-[#486284] text-white" : "hover:bg-[#eff2f6] text-[#3e3e3e]"
                      }`}
                    >
                      <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm">
                        {option}
                      </span>

                      <span
                        className={`flex size-5 flex-shrink-0 items-center justify-center rounded-[6px] border-2 ${
                          selected ? "border-white bg-white/20" : "border-[#828b93]"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
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