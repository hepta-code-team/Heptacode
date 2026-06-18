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

export default function MedicalDataPage() {
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
            placeholder={
              hasSelectedDetail
                ? "z. B. 2019, seit 6 Monaten"
                : "Bitte erst auswählen"
            }
            disabled={!hasSelectedDetail}
            className="h-8 border-none bg-white pr-8 text-xs disabled:cursor-not-allowed disabled:bg-white disabled:text-app-text-muted disabled:opacity-70"
          />
          {detail?.duration.trim() && (
            <Check
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-app-text-primary"
              strokeWidth={3}
              aria-hidden="true"
            />
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
      title="Weitere medizinische Angaben"
      subtitle="Ergänzen Sie optionale Angaben, falls sie für Ihre Beschwerden relevant sind."
      onBack={() => navigate("/patient-data")}
      onSkip={handleSkip}
    >
      {(formData.gender === "Weiblich" || formData.gender === "Divers") && (
        <div
          className={`rounded-[14px] border-2 bg-[#eff2f6] p-3 transition-all ${
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
              placeholder="z.B. Penicillin, Nüsse, Latex"
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
              placeholder="z.B. Blutdruckmittel, Schmerzmittel, Pille"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
            <div className="mt-3 space-y-1.5">
              <label htmlFor="medicationDuration" className="text-xs font-medium text-app-text-subtle">
                Seit wenn nehmen Sie diese Medikamente?
              </label>
              <Input
                id="medicationDuration"
                value={formData.medicationDuration}
                onChange={(event) => 
                  setFormData({ ...formData, medicationDuration: event.target.value})
                }
                placeholder="z.b.B seit 2021, seit 3 Wochen, unbekannt"
                className="!bg-white"
              />
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Einfluss durch Alkohol, Drogen oder Medikamente"
            icon={Wine}
            isOpen={expandedMedicalSections.substance}
            onToggle={() => toggleMedicalSection("substance")}
            summary={
              formData.substanceInfluence === "Nein"
                ? "Nein ausgewählt"
                : formData.substanceInfluence
            }
            isCompleted={formData.substanceInfluence !== "Nein"}
          >
            <div className="grid grid-cols-2 gap-2">
              {["Nein", "Alkohol", "Drogen", "Medikamente"].map((option) => {
                const isSelected = formData.substanceInfluence === option;

                return (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={isSelected}
                    onClick={() =>
                      setFormData({ ...formData, substanceInfluence: option })
                    }
                  />
                );
              })}
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Auslandsaufenthalt in den letzten 3 Monaten"
            icon={Globe2}
            isOpen={expandedMedicalSections.abroad}
            onToggle={() => toggleMedicalSection("abroad")}
            summary={
              formData.recentAbroad
                ? formData.recentAbroadDetails || "Ja ausgewählt"
                : "Nein ausgewählt"
            }
            isCompleted={formData.recentAbroad}
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Nein", value: false },
                { label: "Ja", value: true },
              ].map((option) => {
                const isSelected = formData.recentAbroad === option.value;

                return (
                  <OptionButton
                    key={option.label}
                    label={option.label}
                    selected={isSelected}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        recentAbroad: option.value,
                        recentAbroadDetails: option.value
                          ? formData.recentAbroadDetails
                          : "",
                      })
                    }
                  />
                );
              })}
            </div>
            {formData.recentAbroad && (
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

      <div
        className={`mt-4 rounded-[14px] border-2 bg-[#eff2f6] p-3 transition-all ${
          smokingStatus !== "Nein" ? "border-[#486284]" : "border-transparent"
        }`}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-app-text-primary">
            <Cigarette className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Rauchen
            </p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs">
              Optional, aber hilfreich für Atem-, Herz- und Gefäßbeschwerden.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(["Nein", "Gelegentlich", "Ja"] as SmokingStatus[]).map((status) => (
            <OptionButton
              key={status}
              label={status}
              selected={smokingStatus === status}
              onClick={() => {
                setSmokingStatus(status);
                setFormData({
                  ...formData,
                  isSmoker: status !== "Nein",
                  smokingSinceYears:
                    status === "Nein" ? "" : formData.smokingSinceYears,
                  cigarettesPerDay:
                    status === "Nein" ? "" : formData.cigarettesPerDay,
                });
              }}
            />
          ))}
        </div>

        {smokingStatus !== "Nein" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor="smokingSinceYears"
                className="mb-1 block text-xs font-bold text-app-text-body"
              >
                Seit wann? (Jahre)
              </Label>
              <div className="flex h-9 overflow-hidden rounded-[10px] bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      smokingSinceYears: String(
                        Math.max(
                          Number(formData.smokingSinceYears || 0) - 1,
                          0,
                        ),
                      ),
                    })
                  }
                  className="w-10 border-r border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
                  aria-label="Rauchdauer verringern"
                >
                  -
                </button>
                <input
                  id="smokingSinceYears"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.smokingSinceYears ?? ""}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      smokingSinceYears: event.target.value,
                    })
                  }
                  placeholder="0"
                  className="min-w-0 flex-1 bg-white px-3 text-center text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      smokingSinceYears: String(
                        Number(formData.smokingSinceYears || 0) + 1,
                      ),
                    })
                  }
                  className="w-10 border-l border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
                  aria-label="Rauchdauer erhöhen"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <Label
                htmlFor="cigarettesPerDay"
                className="mb-1 block text-xs font-bold text-app-text-body"
              >
                Menge pro Tag
              </Label>
              <div className="flex h-9 overflow-hidden rounded-[10px] bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      cigarettesPerDay: String(
                        Math.max(Number(formData.cigarettesPerDay || 0) - 1, 0),
                      ),
                    })
                  }
                  className="w-10 border-r border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
                  aria-label="Zigaretten pro Tag verringern"
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
                  className="min-w-0 flex-1 bg-white px-3 text-center text-sm font-semibold outline-none"
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
                  aria-label="Zigaretten pro Tag erhöhen"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Vorerkrankungen
          </p>
          <button
            type="button"
            onClick={clearAllConditionSelections}
            disabled={formData.conditions.length === 0}
            className="rounded-[10px] bg-white p-2 text-app-text-primary transition-all hover:bg-[#dde3ea] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Alle Auswahlen aufheben"
            title="Alle Auswahlen aufheben"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>

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
            const opensUpward = true;

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
                    className={`bg-[#eff2f6] rounded-[10px] p-2.5 min-h-[88px] flex flex-col justify-center gap-1.5 transition-all ${
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
                  className={`bg-[#eff2f6] rounded-[10px] p-3 min-h-[88px] w-full flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
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
                    <p className="max-w-full whitespace-normal break-words text-xs font-medium leading-snug text-app-text-primary">
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