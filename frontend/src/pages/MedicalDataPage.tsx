import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Baby,
  Check,
  ChevronDown,
  Cigarette,
  CircleAlert,
  Globe2,
  HeartPulse,
  Pill,
  Wine,
  type LucideIcon,
} from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { PatientData } from "../../../shared/patientData.types";

type MedicalSection =
  | "allergies"
  | "medications"
  | "substance"
  | "abroad"
  | "smoking";
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
  alcoholSince: "",
  alcoholFrequencyPerDay: "",
  drugDetails: "",
  drugSince: "",
  drugFrequencyPerDay: "",
  recentAbroad: "",
  recentAbroadDetails: "",
  conditions: [],
  isSmoker: "",
  smokingSinceYears: "",
  cigarettesPerDay: "",
  conditionDetails: {},
  ...patientData,
});

function hasSubstance(value: string | undefined, substance: "Alkohol" | "Drogen") {
  return Boolean(value?.toLowerCase().includes(substance.toLowerCase()));
}

function buildSubstanceInfluence(
  _data: Pick<
    PatientData,
    "alcoholSince" | "alcoholFrequencyPerDay" | "drugDetails" | "drugSince" | "drugFrequencyPerDay"
  >,
  selection: { alcohol: boolean; drugs: boolean },
) {
  if (selection.alcohol && selection.drugs) {
    return "Alkohol und Drogen ausgewählt";
  }

  if (selection.alcohol) {
    return "Alkohol ausgewählt";
  }

  if (selection.drugs) {
    return "Drogen ausgewählt";
  }

  return "";
}

function getSubstanceSummary(data: PatientData) {
  return data.substanceInfluence.trim() && data.substanceInfluence.trim() !== "Nein"
    ? data.substanceInfluence
    : "Optional ergänzen";
}

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
      className={`shadow-md rounded-[14px] border-2 p-3 transition-all ${
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
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs block whitespace-normal break-words leading-snug"
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

export default function MedicalDataPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();
  const [formData, setFormData] = useState<PatientData>(() =>
    createInitialPatientData(patientData ?? undefined),
  );
  const [expandedMedicalSections, setExpandedMedicalSections] = useState<
    Record<MedicalSection, boolean>
  >({
    allergies: false,
    medications: false,
    substance: false,
    abroad: false,
    smoking: false,
  });
  const [, setExpandedConditionDetails] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setPatientData(formData);
  }, [formData, setPatientData]);

  const toggleMedicalSection = (section: MedicalSection) => {
    setExpandedMedicalSections((sections) => {
      const shouldOpenSection = !sections[section];

      return {
        allergies: false,
        medications: false,
        substance: false,
        abroad: false,
        smoking: false,
        [section]: shouldOpenSection,
      };
    });
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

  const updateSubstanceDetails = (
    updates: Partial<
      Pick<
        PatientData,
        "alcoholSince" | "alcoholFrequencyPerDay" | "drugDetails" | "drugSince" | "drugFrequencyPerDay"
      >
    >,
  ) => {
    setFormData((prev) => {
      const nextData = { ...prev, ...updates };

      return {
        ...nextData,
        substanceInfluence: buildSubstanceInfluence(nextData, {
          alcohol: hasSubstance(prev.substanceInfluence, "Alkohol"),
          drugs: hasSubstance(prev.substanceInfluence, "Drogen"),
        }),
      };
    });
  };

  const toggleSubstanceInfluence = (substance: "Alkohol" | "Drogen") => {
    setFormData((prev) => {
      const nextSelection = {
        alcohol:
          substance === "Alkohol"
            ? !hasSubstance(prev.substanceInfluence, "Alkohol")
            : hasSubstance(prev.substanceInfluence, "Alkohol"),
        drugs:
          substance === "Drogen"
            ? !hasSubstance(prev.substanceInfluence, "Drogen")
            : hasSubstance(prev.substanceInfluence, "Drogen"),
      };

      const nextData: PatientData = {
        ...prev,
        ...(nextSelection.alcohol
          ? {}
          : {
              alcoholSince: "",
              alcoholFrequencyPerDay: "",
            }),
        ...(nextSelection.drugs
          ? {}
          : {
              drugDetails: "",
              drugSince: "",
              drugFrequencyPerDay: "",
            }),
      };

      return {
        ...nextData,
        substanceInfluence: buildSubstanceInfluence(nextData, nextSelection),
      };
    });
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
    navigate("/pre-existing-conditions");
  };

  const handleSkip = () => {
    navigate("/pre-existing-conditions");
  };

  const isAlcoholSelected = hasSubstance(formData.substanceInfluence, "Alkohol");
  const isDrugSelected = hasSubstance(formData.substanceInfluence, "Drogen");
  const smokingDurationLabel = formData.isSmoker === "Früher" ? "Seit wann nicht mehr?" : "Seit wann?";
  const smokingAmountLabel = formData.isSmoker === "Gelegentlich" ? "Menge pro Monat" : "Menge pro Tag";

  return (
    <PageShell
      title="Weitere medizinische Angaben"
      subtitle="Ergänzen Sie optionale Angaben, falls sie für Ihre Beschwerden relevant sind."
      onBack={() => navigate("/patient-data")}
      onSkip={handleSkip}
    >
      {(formData.gender === "Weiblich" || formData.gender === "Divers") && (
        <div
          className={`shadow-md rounded-[14px] border-2 bg-[#eff2f6] p-3 transition-all ${
            formData.isPregnant || formData.isBreastfeeding
              ? "border-[#486284]"
              : "border-transparent"
          }`}
        >
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-2"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Schwangerschaft / Stillen
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: "isPregnant", label: "Derzeit schwanger", icon: Baby },
              {
                key: "isBreastfeeding",
                label: "Derzeit stillend",
                icon: HeartPulse,
              },
            ].map((item) => {
              const key = item.key as "isPregnant" | "isBreastfeeding";
              const Icon = item.icon;
              const isSelected = formData[key];

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, [key]: !formData[key] })
                  }
                  className={`w-full p-3 rounded-[12px] text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? "bg-[#486284] text-white"
                      : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                  }`}
                >
                  <Icon
                    className={`size-5 flex-shrink-0 ${isSelected ? "text-white" : "text-app-text-primary"}`}
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 flex-1 whitespace-normal break-words font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm leading-snug"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {item.label}
                  </span>
                  <SelectionMark selected={isSelected} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <MedicalAccordionPanel
            title="Allergien / Unverträglichkeiten"
            icon={CircleAlert}
            isOpen={expandedMedicalSections.allergies}
            onToggle={() => toggleMedicalSection("allergies")}
            summary={formData.allergies.trim() || "Optional ergänzen"}
            isCompleted={Boolean(formData.allergies.trim())}
          >
            <Label htmlFor="allergies" className="sr-only">
              Allergien / Unverträglichkeiten
            </Label>
            <textarea
              id="allergies"
              value={formData.allergies}
              onChange={(event) =>
                setFormData({ ...formData, allergies: event.target.value })
              }
              placeholder="z. B. Penicillin, Nüsse, Latex"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Aktuelle Medikamente"
            icon={Pill}
            isOpen={expandedMedicalSections.medications}
            onToggle={() => toggleMedicalSection("medications")}
            summary={formData.medications.trim() || "Optional ergänzen"}
            isCompleted={Boolean(formData.medications.trim())}
          >
            <Label htmlFor="medications" className="sr-only">
              Aktuelle Medikamente
            </Label>
            <textarea
              id="medications"
              value={formData.medications}
              onChange={(event) =>
                setFormData({ ...formData, medications: event.target.value })
              }
              placeholder="z. B. Blutdruckmittel, Schmerzmittel, Pille"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
            <div className="mt-3 space-y-1.5">
              <label htmlFor="medicationDuration" className="text-xs font-medium text-app-text-subtle">
                Seit wann nehmen Sie diese Medikamente?
              </label>
              <Input
                id="medicationDuration"
                value={formData.medicationDuration}
                onChange={(event) =>
                  setFormData({ ...formData, medicationDuration: event.target.value })
                }
                placeholder="z. B. seit 2021, seit 3 Wochen, unbekannt"
                className="!bg-white"
              />
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Einfluss durch Alkohol oder/und Drogen"
            icon={Wine}
            isOpen={expandedMedicalSections.substance}
            onToggle={() => toggleMedicalSection("substance")}
            summary={getSubstanceSummary(formData)}
            isCompleted={isAlcoholSelected || isDrugSelected}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["Alkohol", "Drogen"] as const).map((option) => {
                const isSelected = option === "Alkohol" ? isAlcoholSelected : isDrugSelected;

                return (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={isSelected}
                    onClick={() => toggleSubstanceInfluence(option)}
                  />
                );
              })}
            </div>

            {isAlcoholSelected && (
              <div className="mt-3 rounded-[12px] bg-white p-3">
                <p
                  className="mb-2 font-['DM_Sans:Bold',sans-serif] text-xs font-bold text-app-text-body"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Alkoholkonsum
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="alcoholSince" className="text-xs font-medium text-app-text-subtle">
                      Seit wann?
                    </Label>
                    <Input
                      id="alcoholSince"
                      value={formData.alcoholSince ?? ""}
                      onChange={(event) => updateSubstanceDetails({ alcoholSince: event.target.value })}
                      placeholder="z. B. seit 2021"
                      className="!bg-[#f8fafc]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="alcoholFrequencyPerDay" className="text-xs font-medium text-app-text-subtle">
                      Wie oft am Tag?
                    </Label>
                    <Input
                      id="alcoholFrequencyPerDay"
                      value={formData.alcoholFrequencyPerDay ?? ""}
                      onChange={(event) => updateSubstanceDetails({ alcoholFrequencyPerDay: event.target.value })}
                      placeholder="z. B. 1 Glas"
                      className="!bg-[#f8fafc]"
                    />
                  </div>
                </div>
              </div>
            )}

            {isDrugSelected && (
              <div className="mt-3 rounded-[12px] bg-white p-3">
                <p
                  className="mb-2 font-['DM_Sans:Bold',sans-serif] text-xs font-bold text-app-text-body"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Drogenkonsum
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="drugDetails" className="text-xs font-medium text-app-text-subtle">
                      Welche Drogen oder Substanzen nehmen Sie ein?
                    </Label>
                    <textarea
                      id="drugDetails"
                      value={formData.drugDetails ?? ""}
                      onChange={(event) => updateSubstanceDetails({ drugDetails: event.target.value })}
                      placeholder="Freitext, z. B. Cannabis, Kokain oder Amphetamine"
                      rows={3}
                      className="w-full resize-y rounded-[10px] border border-[#d8e0ea] bg-[#f8fafc] px-3 py-2 text-sm text-app-text-body outline-none transition-all placeholder:text-app-text-muted focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="drugSince" className="text-xs font-medium text-app-text-subtle">
                        Seit wann?
                      </Label>
                      <Input
                        id="drugSince"
                        value={formData.drugSince ?? ""}
                        onChange={(event) => updateSubstanceDetails({ drugSince: event.target.value })}
                        placeholder="z. B. seit 6 Monaten"
                        className="!bg-[#f8fafc]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="drugFrequencyPerDay" className="text-xs font-medium text-app-text-subtle">
                        Wie oft am Tag?
                      </Label>
                      <Input
                        id="drugFrequencyPerDay"
                        value={formData.drugFrequencyPerDay ?? ""}
                        onChange={(event) => updateSubstanceDetails({ drugFrequencyPerDay: event.target.value })}
                        placeholder="z. B. 2-mal"
                        className="!bg-[#f8fafc]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Auslandsaufenthalt in den letzten 3 Monaten"
            icon={Globe2}
            isOpen={expandedMedicalSections.abroad}
            onToggle={() => toggleMedicalSection("abroad")}
            summary={
              formData.recentAbroad === "Ja"
                ? formData.recentAbroadDetails || "Ja ausgewählt"
                : formData.recentAbroad === "Nein"
                  ? "Nein ausgewählt"
                  : "Optional ergänzen"
            }
            isCompleted={formData.recentAbroad !== ""}
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Nein", value: "Nein" },
                { label: "Ja", value: "Ja" },
              ].map((option) => {
                const isSelected = formData.recentAbroad === option.value;

                return (
                  <OptionButton
                    key={option.label}
                    label={option.label}
                    selected={isSelected}
                    onClick={() => {
                      const nextRecentAbroad = formData.recentAbroad === option.value ? "" : option.value;

                      setFormData({
                        ...formData,
                        recentAbroad: nextRecentAbroad,
                        recentAbroadDetails: nextRecentAbroad === "Ja"
                          ? formData.recentAbroadDetails
                          : "",
                      });
                    }}
                  />
                );
              })}
            </div>
            {formData.recentAbroad === "Ja" && (
              <Input
                id="recentAbroadDetails"
                value={formData.recentAbroadDetails}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    recentAbroadDetails: event.target.value,
                  })
                }
                placeholder="Land / Region, falls bekannt"
                className="bg-white border-none text-xs h-9"
              />
            )}
          </MedicalAccordionPanel>
        </div>
      </div>

      <div className="mt-4">
        <MedicalAccordionPanel
          title="Rauchen"
          icon={Cigarette}
          isOpen={expandedMedicalSections.smoking}
          onToggle={() => toggleMedicalSection("smoking")}
          summary={
            formData.isSmoker === ""
              ? "Optional ergänzen"
              : formData.isSmoker === "Nein" || formData.isSmoker === "Nie"
                ? "Nie ausgewählt"
                : `${formData.isSmoker} ausgewählt`
          }
          isCompleted={formData.isSmoker !== ""}
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {(["Nie", "Früher", "Gelegentlich", "Regelmäßig"] as const).map((status) => (
              <OptionButton
                key={status}
                label={status}
                selected={formData.isSmoker === status}
                onClick={() => {
                  const nextIsSmoker = formData.isSmoker === status ? "" : status;

                  setFormData({
                    ...formData,
                    isSmoker: nextIsSmoker,
                    smokingSinceYears:
                      nextIsSmoker === "" || nextIsSmoker === "Nie" ? "" : formData.smokingSinceYears,
                    cigarettesPerDay:
                      nextIsSmoker === "" || nextIsSmoker === "Nie" ? "" : formData.cigarettesPerDay,
                  });
                }}
              />
            ))}
          </div>

          {formData.isSmoker !== "" && formData.isSmoker !== "Nie" && formData.isSmoker !== "Nein" && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label
                  htmlFor="smokingSinceYears"
                  className="mb-1 block text-xs font-bold text-app-text-body"
                >
                  {smokingDurationLabel}
                </Label>
                <Input
                  id="smokingSinceYears"
                  type="text"
                  value={formData.smokingSinceYears ?? ""}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      smokingSinceYears: event.target.value,
                    })
                  }
                  placeholder="z. B. seit 3 Jahren, seit 2019, unbekannt"
                  className="bg-white border-none text-xs h-9"
                />
              </div>
              <div>
                <Label
                  htmlFor="cigarettesPerDay"
                  className="mb-1 block text-xs font-bold text-app-text-body"
                >
                  {smokingAmountLabel}
                </Label>
                <div className="flex h-9 overflow-hidden rounded-[10px] bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        cigarettesPerDay: String(
                          Math.max(
                            Number(formData.cigarettesPerDay || 0) - 1,
                            0,
                          ),
                        ),
                      })
                    }
                    className="w-10 border-r border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
                    aria-label="Rauchmenge verringern"
                  >
                    -
                  </button>
                  <input
                    id="cigarettesPerDay"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.cigarettesPerDay ?? ""}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        cigarettesPerDay: event.target.value,
                      })
                    }
                    placeholder="0"
                    className="min-w-0 flex-1 bg-white px-3 text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        cigarettesPerDay: String(
                          Number(formData.cigarettesPerDay || 0) + 1,
                        ),
                      })
                    }
                    className="w-10 border-l border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
                    aria-label="Rauchmenge erhöhen"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </MedicalAccordionPanel>
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
    </PageShell>
  );
}