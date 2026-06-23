import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  Baby,
  Brain,
  Check,
  ChevronDown,
  Cigarette,
  CircleAlert,
  CircleHelp,
  Droplets,
  Globe2,
  HeartPulse,
  Pill,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Wind,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PRE_EXISTING_CONDITIONS } from "../features/symptoms/symptoms.constants";
import type { PatientData } from "../../../shared/patientData.types";

type MedicalSection = "allergies" | "medications" | "substance" | "abroad";
type SmokingStatus = "Nein" | "Gelegentlich" | "Ja";

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
  substanceInfluence: "Nein",
  recentAbroad: false,
  recentAbroadDetails: "",
  conditions: [],
  isSmoker: false,
  smokingSinceYears: "",
  cigarettesPerDay: "",
  conditionDetails: {},
  ...patientData,
});

/**
 * Reusable disclosure panel for optional medical sections.
 *
 * It keeps the visual summary visible while hiding longer inputs until the user
 * chooses to provide details.
 */
function MedicalAccordionPanel({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  summary,
  isCompleted = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: () => void;
  summary: string;
  isCompleted?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[14px] border-2 p-3 transition-all ${
        isCompleted
          ? "border-[#486284] bg-[#eff2f6]"
          : "border-transparent bg-[#eff2f6]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-app-text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm block"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {title}
          </span>
          <span
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs block truncate"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {summary}
          </span>
        </span>
        <ChevronDown
          className={`size-5 flex-shrink-0 text-app-text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex size-5 flex-shrink-0 items-center justify-center rounded-[6px] border-2 transition-all ${
        selected ? "border-current bg-white/20" : "border-[#828b93]"
      }`}
      aria-hidden="true"
    >
      {selected && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
        selected
          ? "bg-[#486284] text-white"
          : "bg-white text-app-text-body hover:bg-[#dde3ea]"
      }`}
    >
      <span
        className="min-w-0 flex-1 whitespace-normal break-words font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm leading-snug"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {label}
      </span>
      <SelectionMark selected={selected} />
    </button>
  );
}

export default function PreExistingConditionsPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();
  const conditionsGridRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState<PatientData>(() =>
    createInitialPatientData(patientData ?? undefined),
  );
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>(() =>
    patientData?.isSmoker ? "Ja" : "Nein",
  );
  const [expandedMedicalSections, setExpandedMedicalSections] = useState<
    Record<MedicalSection, boolean>
  >({
    allergies: false,
    medications: false,
    substance: false,
    abroad: false,
  });
  const [expandedConditionDetails, setExpandedConditionDetails] = useState<
    Record<string, boolean>
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

  const toggleMedicalSection = (section: MedicalSection) => {
    setExpandedMedicalSections((sections) => ({
      ...sections,
      [section]: !sections[section],
    }));
  };

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
          className="grid grid-cols-2 md:grid-cols-3 gap-2"
        >
          {PRE_EXISTING_CONDITIONS.map((condition, index) => {
            const Icon =
              conditionIcons[condition as keyof typeof conditionIcons] ??
              CircleHelp;
            const isSelected = formData.conditions.includes(condition);
            const otherValue =
              formData.conditionDetails?.Sonstige?.detail ?? "";
            const config = CONDITION_DETAIL_CONFIGS[condition];
            const detail = formData.conditionDetails?.[condition]?.detail ?? "";
            const isOpen = expandedConditionDetails[condition] ?? false;
            const opensUpward = false;

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
                    className={`bg-[#eff2f6] rounded-[10px] p-2.5 h-[88px] flex flex-col justify-center gap-1.5 transition-all ${
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
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-xs leading-tight"
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
                      className={`absolute z-10 left-0 right-0 max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-[12px] border-2 border-[#486284] bg-white shadow-lg ${
                        opensUpward ? "bottom-full mb-1" : "top-full mt-1"
                      }`}
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
                  className={`bg-[#eff2f6] rounded-[10px] p-3 h-[88px] w-full flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                    isSelected ? "ring-2 ring-[#486284]" : "hover:bg-[#dde3ea]"
                  }`}
                  aria-expanded={isOpen}
                >
                  <ChevronDown
                    className={`absolute right-3 top-3 size-4 text-app-text-primary/60 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <Icon
                    className={`size-6 ${isSelected ? "text-app-text-primary" : "text-app-text-muted"}`}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-xs leading-tight"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {condition}
                  </p>
                  {detail && (
                    <p className="max-h-8 max-w-full overflow-hidden whitespace-normal break-words text-xs font-medium leading-snug text-app-text-primary">
                      {detail}
                    </p>
                  )}
                </button>

                {isOpen && config && (
                  <div
                    className={`absolute z-10 left-0 right-0 max-h-[calc(100dvh-12rem)] overflow-y-auto bg-white border-2 border-[#486284] rounded-[12px] shadow-lg ${
                      opensUpward ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
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
                    {renderConditionDurationField(condition)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center lg:justify-end">
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