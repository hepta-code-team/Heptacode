import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  Brain,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  HeartPulse,
  Pill,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Wind,
  X,
} from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PRE_EXISTING_CONDITIONS } from "../features/symptoms/symptoms.constants";
import type { PatientData } from "../../../shared/patientData.types";

const conditionIcons = {
  Diabetes: Droplets,
  Bluthochdruck: Activity,
  Herzerkrankungen: HeartPulse,
  "Asthma/COPD": Wind,
  Nierenerkrankungen: ShieldAlert,
  Lebererkrankungen: Stethoscope,
  Epilepsie: Pill,
  "Psychische Erkrankung": Brain,
  Sonstige: CircleHelp,
};

const CONDITION_DETAIL_CONFIGS: Record<
  string,
  { label: string; options: string[] }
> = {
  Diabetes: {
    label: "Diabetes-Typ",
    options: ["Typ 1", "Typ 2", "Schwangerschaftsdiabetes", "Unklar"],
  },
  Bluthochdruck: {
    label: "Einstellung",
    options: ["Gut eingestellt", "Schwankend", "Häufig erhöht", "Unklar"],
  },
  Herzerkrankungen: {
    label: "Art der Herzerkrankung",
    options: [
      "Koronare Herzkrankheit",
      "Herzrhythmusstörung",
      "Herzinsuffizienz",
      "Herzinfarkt früher",
      "Unklar",
    ],
  },
  "Asthma/COPD": {
    label: "Art der Lungenerkrankung",
    options: ["Asthma", "COPD", "Asthma + COPD", "Unklar"],
  },
  Nierenerkrankungen: {
    label: "Art der Nierenerkrankung",
    options: [
      "Chronische Nierenerkrankung",
      "Dialyse",
      "Nierensteine",
      "Wiederkehrende Infekte",
      "Unklar",
    ],
  },
  Lebererkrankungen: {
    label: "Art der Lebererkrankung",
    options: [
      "Fettleber",
      "Hepatitis",
      "Leberzirrhose",
      "Erhöhte Leberwerte",
      "Unklar",
    ],
  },
  Epilepsie: {
    label: "Letzter Anfall",
    options: [
      "In den letzten 24 Stunden",
      "In den letzten 4 Wochen",
      "Länger her",
      "Unklar",
    ],
  },
  "Psychische Erkrankung": {
    label: "Art der Erkrankung",
    options: [
      "Depressionen",
      "Angststörung",
      "Suchterkrankung",
      "Zwangsstörung",
    ],
  },
};

/**
 * Creates the medical-data form state with persisted values applied.
 *
 * The defaults keep every optional field controlled from the first render, which
 * avoids null checks throughout the large medical questionnaire.
 */
const createInitialPatientData = (
  patientData?: Partial<PatientData>,
): PatientData => ({
  birthMonth: "",
  birthYear: "",
  height: "",
  weight: "",
  gender: "",
  isPregnant: false,
  isBreastfeeding: false,
  allergies: "",
  medications: "",
  medicationDuration: "",
  substanceInfluence: "",
  recentAbroad: "",
  recentAbroadDetails: "",
  conditions: [],
  isSmoker: "",
  smokingSinceYears: "",
  cigarettesPerDay: "",
  conditionDetails: {},
  ...patientData,
});

export default function PreExistingConditionsPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();
  const conditionsGridRef = useRef<HTMLDivElement | null>(null);
  const conditionDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [formData, setFormData] = useState<PatientData>(() =>
    createInitialPatientData(patientData ?? undefined),
  );

  const [expandedConditionDetails, setExpandedConditionDetails] = useState<
    Record<string, boolean>
  >({});
  const [conditionDropdownMaxHeights, setConditionDropdownMaxHeights] = useState<
    Record<string, number | undefined>
  >({});

  /**
   * Closes condition-detail dropdowns when the user clicks outside the grid.
   *
   * This keeps multiple inline popovers from staying open while users continue
   * through the rest of the medical questionnaire.
   */
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (conditionsGridRef.current?.contains(event.target as Node)) return;
      setExpandedConditionDetails({});
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setPatientData(formData);
  }, [formData, setPatientData]);

  /**
   * Caps opened condition lists to the remaining page space below the trigger so
   * a dropdown can scroll internally only when it would otherwise extend beyond
   * the page bottom. Short lists remain below the cap and show no scrollbar.
   */
  useEffect(() => {
    const updateDropdownMaxHeights = () => {
      const nextMaxHeights: Record<string, number | undefined> = {};

      for (const [condition, isOpen] of Object.entries(
        expandedConditionDetails,
      )) {
        if (!isOpen) continue;

        const dropdown = conditionDropdownRefs.current[condition];
        if (!dropdown) continue;

        const pagePadding = 16;
        const pageBottom =
          dropdown.closest("main")?.getBoundingClientRect().bottom ??
          document.documentElement.getBoundingClientRect().bottom;
        const availableHeight =
          pageBottom - dropdown.getBoundingClientRect().top - pagePadding;

        nextMaxHeights[condition] = Math.max(0, availableHeight);
      }

      setConditionDropdownMaxHeights(nextMaxHeights);
    };

    const frameId = window.requestAnimationFrame(updateDropdownMaxHeights);
    window.addEventListener("resize", updateDropdownMaxHeights);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateDropdownMaxHeights);
    };
  }, [expandedConditionDetails, formData.conditionDetails]);

  const toggleConditionDropdown = (condition: string) => {
    setExpandedConditionDetails((sections) => ({
      [condition]: !sections[condition],
    }));
  };

  const clearAllConditionSelections = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [],
      conditionDetails: {},
    }));
    setExpandedConditionDetails({});
  };

  const clearOtherConditionSelection = () => {
    setFormData((prev) => {
      const { Sonstige: _removedDetail, ...nextConditionDetails } =
        prev.conditionDetails ?? {};

      return {
        ...prev,
        conditions: prev.conditions.filter(
          (condition) => condition !== "Sonstige",
        ),
        conditionDetails: nextConditionDetails,
      };
    });
    setExpandedConditionDetails({});
  };

  const clearConditionSelection = (condition: string) => {
    setFormData((prev) => {
      const { [condition]: _removedDetail, ...nextConditionDetails } =
        prev.conditionDetails ?? {};

      return {
        ...prev,
        conditions: prev.conditions.filter(
          (selectedCondition) => selectedCondition !== condition,
        ),
        conditionDetails: nextConditionDetails,
      };
    });
    setExpandedConditionDetails({});
  };

  const toggleConditionSelection = (condition: string) => {
    toggleConditionDropdown(condition);
  };

  /**
   * Selects a predefined detail and ensures the parent condition is active.
   *
   * Choosing a detail implies the condition itself should be included in the
   * assessment payload, even if the main condition button was not toggled first.
   */
  const selectConditionDetail = (condition: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions
        : [...prev.conditions, condition],
      conditionDetails: {
        ...(prev.conditionDetails ?? {}),
        [condition]: {
          condition,
          detail: value,
          duration: prev.conditionDetails?.[condition]?.duration ?? "",
        },
      },
    }));
    setExpandedConditionDetails({ [condition]: true });
  };

  /**
   * Keeps the custom "Sonstige" condition synchronized with its free-text value.
   *
   * Clearing the field removes the synthetic condition so empty custom entries
   * do not get sent to triage or PDF export.
   */
  const updateOtherCondition = (value: string) => {
    const trimmedValue = value.trim();

    setExpandedConditionDetails(trimmedValue ? { Sonstige: true } : {});

    setFormData((prev) => {
      const nextConditions = trimmedValue
        ? prev.conditions.includes("Sonstige")
          ? prev.conditions
          : [...prev.conditions, "Sonstige"]
        : prev.conditions.filter((condition) => condition !== "Sonstige");

      return {
        ...prev,
        conditions: nextConditions,
        conditionDetails: {
          ...(prev.conditionDetails ?? {}),
          Sonstige: {
            condition: "Sonstige",
            detail: value,
            duration: prev.conditionDetails?.Sonstige?.duration ?? "",
          },
        },
      };
    });
  };

  const updateConditionDuration = (condition: string, duration: string) => {
    setFormData((prev) => {
      const currentDetail = prev.conditionDetails?.[condition];

      return {
        ...prev,
        conditionDetails: {
          ...(prev.conditionDetails ?? {}),
          [condition]: {
            condition,
            detail: currentDetail?.detail ?? "",
            duration,
          },
        },
      };
    });
  };

  const collapseConditionDropdown = (condition: string) => {
    setExpandedConditionDetails((sections) => ({
      ...sections,
      [condition]: false,
    }));
  };

  const renderConditionDurationField = (
    condition: string,
    options: { showLabel?: boolean } = {},
  ) => {
    const detail = formData.conditionDetails?.[condition];
    const hasSelectedDetail = Boolean(detail?.detail.trim());
    const showLabel = options.showLabel ?? true;

    return (
      <div
        className="border-t border-gray-200 bg-[#eff2f6] p-3"
        onClick={(event) => event.stopPropagation()}
      >
        {showLabel && (
          <Label
            htmlFor={`conditionDuration-${condition}`}
            className="mb-1 block font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-xs leading-tight"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Seit wann?
          </Label>
        )}
        <div className="relative">
          <Input
            id={`conditionDuration-${condition}`}
            value={detail?.duration ?? ""}
            onChange={(event) =>
              updateConditionDuration(condition, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              collapseConditionDropdown(condition);
            }}
            placeholder={
              hasSelectedDetail
                ? "z. B. 2019, seit 6 Monaten"
                : "Bitte erst auswählen"
            }
            disabled={!hasSelectedDetail}
            className="h-8 border-none bg-white pr-8 text-xs disabled:cursor-not-allowed disabled:bg-white disabled:text-app-text-muted disabled:opacity-70"
          />
          {detail?.duration.trim() && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                collapseConditionDropdown(condition);
              }}
              className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-app-text-primary transition-all hover:bg-[#eff2f6]"
              aria-label={`${condition}-Liste zuklappen`}
              title={`${condition}-Liste zuklappen`}
            >
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleContinue = () => {
    setPatientData(formData);
    navigate("/symptom-selection");
  };

  const handleSkip = () => {
    navigate("/symptom-selection");
  };

  const getConditionNameSize = (isConditionSelected: boolean) =>
    isConditionSelected ? "text-xs" : "text-sm md:text-xs";

  return (
    <PageShell
      title="Vorerkrankungen"
      subtitle="Ergänzen Sie bekannte Vorerkrankungen, falls sie für Ihre Beschwerden relevant sind."
      onBack={() => navigate("/medical-data")}
      onSkip={handleSkip}
    >
      <div className="mt-4 relative">
        <button
          type="button"
          onClick={clearAllConditionSelections}
          disabled={formData.conditions.length === 0}
          className="absolute right-0 top-0 -translate-y-[calc(100%+0.25rem)] rounded-[10px] bg-white p-2 text-app-text-primary transition-all hover:bg-[#dde3ea] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Alle Auswahlen aufheben"
          title="Alle Auswahlen aufheben"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>
        <div
          ref={conditionsGridRef}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3"
        >
          {PRE_EXISTING_CONDITIONS.map((condition) => {
            const Icon =
              conditionIcons[condition as keyof typeof conditionIcons] ??
              CircleHelp;
            const isSelected = formData.conditions.includes(condition);
            const otherValue =
              formData.conditionDetails?.Sonstige?.detail ?? "";
            const config = CONDITION_DETAIL_CONFIGS[condition];
            const detail = formData.conditionDetails?.[condition]?.detail ?? "";
            const isOpen = expandedConditionDetails[condition] ?? false;
            if (condition === "Sonstige") {
              const isOtherOpen =
                expandedConditionDetails.Sonstige ?? false;

              return (
                <div key={condition} className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (otherValue.trim()) toggleConditionDropdown(condition);
                    }}
                    onKeyDown={(event) => {
                      if (
                        !otherValue.trim() ||
                        (event.key !== "Enter" && event.key !== " ")
                      ) {
                        return;
                      }
                      event.preventDefault();
                      toggleConditionDropdown(condition);
                    }}
                    className={`shadow-md bg-[#eff2f6] rounded-[10px] p-2.5 h-[80px] sm:h-[88px] flex flex-col justify-center gap-1.5 transition-all ${
                      otherValue.trim() ? "ring-2 ring-[#486284]" : ""
                    }`}
                    aria-expanded={otherValue.trim() ? isOtherOpen : undefined}
                  >
                    <ChevronDown
                      className={`absolute right-3 top-3 size-4 text-app-text-primary/60 transition-transform ${
                        isOtherOpen ? "rotate-180" : ""
                      } ${otherValue.trim() ? "" : "opacity-0"}`}
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`size-5 ${otherValue.trim() ? "text-app-text-primary" : "text-app-text-muted"}`}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <Label
                        htmlFor="otherCondition"
                        className={`font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body leading-tight ${getConditionNameSize(Boolean(otherValue.trim()))}`}
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        Sonstige
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="otherCondition"
                        value={otherValue}
                        onChange={(event) =>
                          updateOtherCondition(event.target.value)
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedConditionDetails(
                            otherValue.trim() ? { Sonstige: true } : {},
                          );
                        }}
                        onFocus={() =>
                          setExpandedConditionDetails(
                            otherValue.trim() ? { Sonstige: true } : {},
                          )
                        }
                        onKeyDown={(event) => event.stopPropagation()}
                        placeholder="Freitext"
                        className="h-8 border-none bg-white pr-8 text-xs"
                      />
                      {otherValue.trim() && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearOtherConditionSelection();
                          }}
                          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-red-600 transition-all hover:bg-[#eff2f6]"
                          aria-label="Sonstige Angabe löschen"
                          title="Sonstige Angabe löschen"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                  {otherValue.trim() && isOtherOpen && (
                    <div
                      ref={(element) => {
                        conditionDropdownRefs.current[condition] = element;
                      }}
                      className="absolute z-10 left-0 right-0 top-full mt-1 overflow-y-auto overscroll-contain rounded-[12px] border-2 border-[#486284] bg-white shadow-lg"
                      style={{ maxHeight: conditionDropdownMaxHeights[condition] }}
                    >
                      {renderConditionDurationField(condition)}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={condition} className="relative">
                {isSelected && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearConditionSelection(condition);
                    }}
                    className="absolute left-2 top-2 z-[1] flex size-7 items-center justify-center rounded-[8px] text-app-text-primary transition-all hover:bg-white"
                    aria-label={`${condition} aufheben`}
                    title={`${condition} aufheben`}
                  >
                    <X className="size-4 text-red-600" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleConditionSelection(condition)}
                  className={`shadow-md bg-[#eff2f6] rounded-[10px] p-3 h-[80px] sm:h-[88px] w-full flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                    isSelected
                      ? "ring-2 ring-[#486284]"
                      : "hover:bg-[#dde3ea]"
                  }`}
                  aria-expanded={isOpen}
                >
                  <ChevronDown
                    className={`absolute right-3 top-3 size-4 text-app-text-primary/60 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                  {detail ? (
                    <>
                      <Icon
                        className="size-6 text-app-text-primary"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <span className="flex max-w-full min-w-0 flex-col items-center justify-center px-8 text-center">
                        <span
                          className="max-w-full truncate font-['DM_Sans:Bold',sans-serif] text-xs font-bold leading-tight text-app-text-body"
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          {condition}
                        </span>
                        <span className="max-w-full truncate text-xs font-medium leading-snug text-app-text-primary">
                          {detail}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="flex min-w-0 flex-col items-center gap-2">
                      <Icon
                        className={`size-6 ${isSelected ? "text-app-text-primary" : "text-app-text-muted"}`}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <span
                        className={`font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body leading-tight ${getConditionNameSize(isSelected)}`}
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        {condition}
                      </span>
                    </span>
                  )}
                </button>

                {isOpen && config && (
                  <div
                    ref={(element) => {
                      conditionDropdownRefs.current[condition] = element;
                    }}
                    className="absolute z-10 left-0 right-0 top-full mt-1 overflow-y-auto overscroll-contain bg-white border-2 border-[#486284] rounded-[12px] shadow-lg"
                    style={{ maxHeight: conditionDropdownMaxHeights[condition] }}
                  >
                    {config.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectConditionDetail(condition, option)}
                        className="flex w-full items-center justify-between gap-3 border-b border-gray-200 p-3 text-left transition-all last:border-b-0 hover:bg-[#eff2f6]"
                        aria-pressed={detail === option}
                      >
                        <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm text-app-text-body">
                          {option}
                        </span>
                        {detail === option && (
                          <Check
                            className="size-5 shrink-0 text-app-text-primary"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))}
                    {condition !== "Epilepsie" && renderConditionDurationField(condition)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleContinue}>
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Weiter
            </p>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
