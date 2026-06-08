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
  ShieldAlert,
  Stethoscope,
  Wind,
  Wine,
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

type DurationValue = {
  months: string;
  years: string;
  sinceBirth?: boolean;
};

const CONDITION_DETAIL_SEPARATOR = " | ";

const CONDITIONS_WITH_SINCE_BIRTH = new Set([
  "Herzerkrankungen",
  "Nierenerkrankungen",
  "Lebererkrankungen",
  "Epilepsie",
  "Sonstige",
]);

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

const CONDITION_DETAIL_CONFIGS: Record<string, { label: string; options: string[] }> = {
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
    options: ["Koronare Herzkrankheit", "Herzrhythmusstörung", "Herzinsuffizienz", "Herzinfarkt früher", "Unklar"],
  },
  "Asthma/COPD": {
    label: "Art der Lungenerkrankung",
    options: ["Asthma", "COPD", "Asthma + COPD", "Unklar"],
  },
  Nierenerkrankungen: {
    label: "Art der Nierenerkrankung",
    options: ["Chronische Nierenerkrankung", "Dialyse", "Nierensteine", "Wiederkehrende Infekte", "Unklar"],
  },
  Lebererkrankungen: {
    label: "Art der Lebererkrankung",
    options: ["Fettleber", "Hepatitis", "Leberzirrhose", "Erhöhte Leberwerte", "Unklar"],
  },
  Epilepsie: {
    label: "Letzter Anfall",
    options: ["In den letzten 24 Stunden", "In den letzten 4 Wochen", "Länger her", "Unklar"],
  },
  "Psychische Erkrankung": {
    label: "Art der Erkrankung",
    options: ["Depressionen", "Angststörung", "Suchterkrankung", "Zwangsstörung"],
  },
};

const createInitialPatientData = (patientData?: Partial<PatientData>): PatientData => ({
  birthMonth: "",
  birthYear: "",
  height: "",
  weight: "",
  gender: "",
  isPregnant: false,
  isBreastfeeding: false,
  allergies: "",
  medications: "",
  substanceInfluence: "Nein",
  recentAbroad: false,
  recentAbroadDetails: "",
  conditions: [],
  isSmoker: false,
  smokingSinceYears: "",
  cigarettesPerDay: "",
  conditionDetails: {},
  allergyDuration: { months: "", years: "" },
  medicationDuration: { months: "", years: "" },
  conditionDurations: {},
  ...patientData,
});

const emptyDuration = (): DurationValue => ({
  months: "",
  years: "",
  sinceBirth: false,
});

function normalizePositiveInteger(value: string) {
  if (value === "") return "";

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";

  return String(Math.max(Math.floor(numberValue), 0));
}

function getNextNumberValue(value: string, step: number) {
  return String(Math.max(Number(value || 0) + step, 0));
}

function formatDuration(duration: DurationValue, allowSinceBirth = false) {
  if (allowSinceBirth && duration.sinceBirth) {
    return "seit Geburt";
  }

  const months = duration.months.trim();
  const years = duration.years.trim();
  const parts = [];

  if (months) {
    parts.push(`${months} ${months === "1" ? "Monat" : "Monate"}`);
  }

  if (years) {
    parts.push(`${years} ${years === "1" ? "Jahr" : "Jahre"}`);
  }

  return parts.length > 0 ? `seit ${parts.join(", ")}` : "";
}

function parseDurationText(value: string): DurationValue {
  const lowerValue = value.toLowerCase();
  const monthMatch = value.match(/(\d+)\s*Monat/i);
  const yearMatch = value.match(/(\d+)\s*Jahr/i);

  return {
    months: monthMatch?.[1] ?? "",
    years: yearMatch?.[1] ?? "",
    sinceBirth: lowerValue.includes("seit geburt"),
  };
}

function parseTimedText(value: string) {
  const match = value.match(/\s*\((?:Einnahme\s+)?seit\s+(.+?)\)$/i);

  if (!match) {
    return {
      text: value,
      duration: emptyDuration(),
    };
  }

  return {
    text: value.slice(0, match.index).trim(),
    duration: parseDurationText(`seit ${match[1]}`),
  };
}

function buildTimedText(text: string, duration: DurationValue, prefix: "seit" | "Einnahme seit") {
  const trimmedText = text.trim();
  const durationText = formatDuration(duration);

  if (!trimmedText) {
    return "";
  }

  if (!durationText) {
    return trimmedText;
  }

  return prefix === "Einnahme seit"
    ? `${trimmedText} (Einnahme ${durationText})`
    : `${trimmedText} (${durationText})`;
}

function parseConditionValue(value: string) {
  const parts = value
    .split(CONDITION_DETAIL_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
  const durationPart = parts.find((part) => part.toLowerCase().startsWith("seit "));
  const detail = parts.filter((part) => part !== durationPart).join(CONDITION_DETAIL_SEPARATOR);

  return {
    detail,
    duration: durationPart ? parseDurationText(durationPart) : emptyDuration(),
  };
}

function buildConditionValue(detail: string, duration: DurationValue, allowSinceBirth: boolean) {
  const safeDuration = allowSinceBirth ? duration : { ...duration, sinceBirth: false };

  return [detail.trim(), formatDuration(safeDuration, allowSinceBirth)]
    .filter(Boolean)
    .join(CONDITION_DETAIL_SEPARATOR);
}

function MedicalAccordionPanel({
  title,
  icon: Icon,
  isOpen,
  isSelected = false,
  onToggle,
  summary,
  children,
}: {
  title: string;
  icon: LucideIcon;
  isOpen: boolean;
  isSelected?: boolean;
  onToggle: () => void;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[14px] bg-[#eff2f6] p-3 transition-all ${isSelected ? "ring-2 ring-[#486284]" : ""}`}>
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
        selected ? "bg-[#486284] text-white" : "bg-white text-app-text-body hover:bg-[#dde3ea]"
      }`}
    >
      <span
        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1"
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        {label}
      </span>
      <SelectionMark selected={selected} />
    </button>
  );
}

function NumberStepper({
  id,
  label,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs font-bold text-app-text-body">
        {label}
      </Label>
      <div className="flex h-9 overflow-hidden rounded-[10px] bg-white">
        <button
          type="button"
          onClick={() => onChange(getNextNumberValue(value, -1))}
          className="w-10 border-r border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
          aria-label={decreaseLabel}
        >
          -
        </button>
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onChange(normalizePositiveInteger(event.target.value))}
          placeholder="0"
          className="min-w-0 flex-1 bg-white px-3 text-center text-sm font-semibold outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(getNextNumberValue(value, 1))}
          className="w-10 border-l border-[#eff2f6] text-base font-bold text-app-text-primary hover:bg-[#dde3ea]"
          aria-label={increaseLabel}
        >
          +
        </button>
      </div>
    </div>
  );
}

function DurationInputGroup({
  idPrefix,
  duration,
  onChange,
  allowSinceBirth = false,
}: {
  idPrefix: string;
  duration: DurationValue;
  onChange: (duration: DurationValue) => void;
  allowSinceBirth?: boolean;
}) {
  const safeDuration = allowSinceBirth ? duration : { ...duration, sinceBirth: false };

  return (
    <div className="grid grid-cols-1 gap-2">
      {allowSinceBirth && (
        <OptionButton
          label="Seit Geburt"
          selected={Boolean(safeDuration.sinceBirth)}
          onClick={() =>
            onChange({
              months: "",
              years: "",
              sinceBirth: !safeDuration.sinceBirth,
            })
          }
        />
      )}

      {!safeDuration.sinceBirth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <NumberStepper
            id={`${idPrefix}Months`}
            label="Monate"
            value={safeDuration.months}
            onChange={(months) => onChange({ ...safeDuration, months, sinceBirth: false })}
            decreaseLabel="Monate verringern"
            increaseLabel="Monate erhöhen"
          />
          <NumberStepper
            id={`${idPrefix}Years`}
            label="Jahre"
            value={safeDuration.years}
            onChange={(years) => onChange({ ...safeDuration, years, sinceBirth: false })}
            decreaseLabel="Jahre verringern"
            increaseLabel="Jahre erhöhen"
          />
        </div>
      )}
    </div>
  );
}

export default function MedicalDataPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();
  const conditionsGridRef = useRef<HTMLDivElement | null>(null);

  const parsedInitialAllergies = parseTimedText(patientData?.allergies ?? "");
  const parsedInitialMedications = parseTimedText(patientData?.medications ?? "");
  const initialAllergyDuration = patientData?.allergyDuration ?? parsedInitialAllergies.duration;
  const initialMedicationDuration = patientData?.medicationDuration ?? parsedInitialMedications.duration;

  const [formData, setFormData] = useState<PatientData>(() => ({
    ...createInitialPatientData(patientData ?? undefined),
    allergies: parsedInitialAllergies.text,
    medications: parsedInitialMedications.text,
    allergyDuration: initialAllergyDuration,
    medicationDuration: initialMedicationDuration,
    conditionDurations: patientData?.conditionDurations ?? {},
  }));
  const [allergyDuration, setAllergyDuration] = useState<DurationValue>(initialAllergyDuration);
  const [medicationDuration, setMedicationDuration] = useState<DurationValue>(initialMedicationDuration);
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>(() => (patientData?.isSmoker ? "Ja" : "Nein"));
  const [expandedMedicalSections, setExpandedMedicalSections] = useState<Record<MedicalSection, boolean>>({
    allergies: false,
    medications: false,
    substance: false,
    abroad: false,
  });
  const [expandedConditionDetails, setExpandedConditionDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (conditionsGridRef.current?.contains(event.target as Node)) return;
      setExpandedConditionDetails({});
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const toggleMedicalSection = (section: MedicalSection) => {
    setExpandedMedicalSections((sections) => ({
      ...sections,
      [section]: !sections[section],
    }));
  };

  const selectCondition = (condition: string) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(condition) ? prev.conditions : [...prev.conditions, condition],
    }));
  };

  const removeCondition = (condition: string) => {
    setFormData((prev) => {
      const nextConditionDetails = { ...(prev.conditionDetails ?? {}) };
      const nextConditionDurations = { ...(prev.conditionDurations ?? {}) };
      delete nextConditionDetails[condition];
      delete nextConditionDurations[condition];

      return {
        ...prev,
        conditions: prev.conditions.filter((item) => item !== condition),
        conditionDetails: nextConditionDetails,
        conditionDurations: nextConditionDurations,
      };
    });

    setExpandedConditionDetails((sections) => ({
      ...sections,
      [condition]: false,
    }));
  };

  const openConditionDetails = (condition: string, isSelected: boolean) => {
    if (!isSelected) {
      selectCondition(condition);
      setExpandedConditionDetails((sections) => ({
        ...sections,
        [condition]: true,
      }));
      return;
    }

    setExpandedConditionDetails((sections) => ({
      ...sections,
      [condition]: !sections[condition],
    }));
  };

  const updateConditionValue = (condition: string, nextDetail?: string, nextDuration?: DurationValue) => {
    const allowSinceBirth = CONDITIONS_WITH_SINCE_BIRTH.has(condition);

    setFormData((prev) => {
      const parsed = parseConditionValue(prev.conditionDetails?.[condition] ?? "");
      const detail = nextDetail ?? parsed.detail;
      const duration = nextDuration ?? prev.conditionDurations?.[condition] ?? parsed.duration;
      const nextValue = buildConditionValue(detail, duration, allowSinceBirth);
      const safeDuration = allowSinceBirth ? duration : { ...duration, sinceBirth: false };

      return {
        ...prev,
        conditions: prev.conditions.includes(condition) ? prev.conditions : [...prev.conditions, condition],
        conditionDetails: {
          ...(prev.conditionDetails ?? {}),
          [condition]: nextValue,
        },
        conditionDurations: {
          ...(prev.conditionDurations ?? {}),
          [condition]: safeDuration,
        },
      };
    });
  };

  const handleContinue = () => {
    setPatientData({
      ...formData,
      allergies: buildTimedText(formData.allergies, allergyDuration, "seit"),
      medications: buildTimedText(formData.medications, medicationDuration, "Einnahme seit"),
      allergyDuration,
      medicationDuration,
      conditionDurations: formData.conditionDurations ?? {},
    });
    navigate("/symptom-selection");
  };

  return (
    <PageShell
      title="Weitere medizinische Angaben"
      subtitle="Ergänzen Sie optionale Angaben, falls sie für Ihre Beschwerden relevant sind."
      onBack={() => navigate("/patient-data")}
    >
      {(formData.gender === "Weiblich" || formData.gender === "Divers") && (
        <div className="bg-[#eff2f6] rounded-[14px] p-3">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-2"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Schwangerschaft / Stillen
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: "isPregnant", label: "Derzeit schwanger", icon: Baby },
              { key: "isBreastfeeding", label: "Derzeit stillend", icon: HeartPulse },
            ].map((item) => {
              const key = item.key as "isPregnant" | "isBreastfeeding";
              const Icon = item.icon;
              const isSelected = formData[key];

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFormData({ ...formData, [key]: !formData[key] })}
                  className={`w-full p-3 rounded-[12px] text-left transition-all flex items-center gap-3 ${
                    isSelected ? "bg-[#486284] text-white" : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                  }`}
                >
                  <Icon
                    className={`size-5 flex-shrink-0 ${isSelected ? "text-white" : "text-app-text-primary"}`}
                    aria-hidden="true"
                  />
                  <span
                    className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1"
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
            isSelected={formData.allergies.trim().length > 0}
            onToggle={() => toggleMedicalSection("allergies")}
            summary={
              formData.allergies
                ? formatDuration(allergyDuration)
                  ? `Angaben hinterlegt, ${formatDuration(allergyDuration)}`
                  : "Angaben hinterlegt"
                : "Optional ergänzen"
            }
          >
            <textarea
              id="allergies"
              value={formData.allergies}
              onChange={(event) => setFormData({ ...formData, allergies: event.target.value })}
              placeholder="z.B. Penicillin, Nüsse, Latex"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
            <div className="mt-3">
              <p className="mb-2 text-xs font-bold text-app-text-primary">Seit wann?</p>
              <DurationInputGroup idPrefix="allergyDuration" duration={allergyDuration} onChange={setAllergyDuration} />
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Aktuelle Medikamente"
            icon={Pill}
            isOpen={expandedMedicalSections.medications}
            isSelected={formData.medications.trim().length > 0}
            onToggle={() => toggleMedicalSection("medications")}
            summary={
              formData.medications
                ? formatDuration(medicationDuration)
                  ? `Angaben hinterlegt, ${formatDuration(medicationDuration)}`
                  : "Angaben hinterlegt"
                : "Optional ergänzen"
            }
          >
            <textarea
              id="medications"
              value={formData.medications}
              onChange={(event) => setFormData({ ...formData, medications: event.target.value })}
              placeholder="z.B. Blutdruckmittel, Schmerzmittel, Pille"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
            <div className="mt-3">
              <p className="mb-2 text-xs font-bold text-app-text-primary">Einnahme seit wann?</p>
              <DurationInputGroup
                idPrefix="medicationDuration"
                duration={medicationDuration}
                onChange={setMedicationDuration}
              />
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Einfluss durch Alkohol, Drogen oder Medikamente"
            icon={Wine}
            isOpen={expandedMedicalSections.substance}
            isSelected={formData.substanceInfluence !== "Nein"}
            onToggle={() => toggleMedicalSection("substance")}
            summary={formData.substanceInfluence === "Nein" ? "Nein ausgewählt" : formData.substanceInfluence}
          >
            <div className="grid grid-cols-2 gap-2">
              {["Nein", "Alkohol", "Drogen", "Medikamente"].map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={formData.substanceInfluence === option}
                  onClick={() => setFormData({ ...formData, substanceInfluence: option })}
                />
              ))}
            </div>
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Auslandsaufenthalt in den letzten 3 Monaten"
            icon={Globe2}
            isOpen={expandedMedicalSections.abroad}
            isSelected={formData.recentAbroad}
            onToggle={() => toggleMedicalSection("abroad")}
            summary={formData.recentAbroad ? formData.recentAbroadDetails || "Ja ausgewählt" : "Nein ausgewählt"}
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Nein", value: false },
                { label: "Ja", value: true },
              ].map((option) => (
                <OptionButton
                  key={option.label}
                  label={option.label}
                  selected={formData.recentAbroad === option.value}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      recentAbroad: option.value,
                      recentAbroadDetails: option.value ? formData.recentAbroadDetails : "",
                    })
                  }
                />
              ))}
            </div>
            {formData.recentAbroad && (
              <Input
                id="recentAbroadDetails"
                value={formData.recentAbroadDetails}
                onChange={(event) => setFormData({ ...formData, recentAbroadDetails: event.target.value })}
                placeholder="Land / Region, falls bekannt"
                className="bg-white border-none text-xs h-9"
              />
            )}
          </MedicalAccordionPanel>
        </div>
      </div>

      <div
        className={`mt-4 rounded-[14px] bg-[#eff2f6] p-3 transition-all ${
          smokingStatus !== "Nein" ? "ring-2 ring-[#486284]" : ""
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
                  smokingSinceYears: status === "Nein" ? "" : formData.smokingSinceYears,
                  cigarettesPerDay: status === "Nein" ? "" : formData.cigarettesPerDay,
                });
              }}
            />
          ))}
        </div>

        {smokingStatus !== "Nein" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <NumberStepper
              id="smokingSinceYears"
              label="Seit wann? (Jahre)"
              value={formData.smokingSinceYears ?? ""}
              onChange={(value) => setFormData({ ...formData, smokingSinceYears: value })}
              decreaseLabel="Rauchdauer verringern"
              increaseLabel="Rauchdauer erhöhen"
            />

            <NumberStepper
              id="cigarettesPerDay"
              label="Menge pro Tag"
              value={formData.cigarettesPerDay ?? ""}
              onChange={(value) => setFormData({ ...formData, cigarettesPerDay: value })}
              decreaseLabel="Zigaretten pro Tag verringern"
              increaseLabel="Zigaretten pro Tag erhöhen"
            />
          </div>
        )}
      </div>

      <div className="mt-4">
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-2"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Vorerkrankungen
        </p>

        <div ref={conditionsGridRef} className="grid grid-cols-1 items-start md:grid-cols-2 xl:grid-cols-3 gap-2">
          {PRE_EXISTING_CONDITIONS.map((condition) => {
            const Icon = conditionIcons[condition as keyof typeof conditionIcons] ?? CircleHelp;
            const isSelected = formData.conditions.includes(condition);
            const isOpen = expandedConditionDetails[condition] ?? false;
            const config = CONDITION_DETAIL_CONFIGS[condition];
            const allowSinceBirth = CONDITIONS_WITH_SINCE_BIRTH.has(condition);
            const parsedConditionText = parseConditionValue(formData.conditionDetails?.[condition] ?? "");
            const parsedCondition = {
              ...parsedConditionText,
              duration: formData.conditionDurations?.[condition] ?? parsedConditionText.duration,
            };
            const displayDetail = [
              parsedCondition.detail,
              formatDuration(parsedCondition.duration, allowSinceBirth),
            ].filter(Boolean).join(", ");

            return (
              <div
                key={condition}
                className={`self-start rounded-[12px] bg-[#eff2f6] p-3 transition-all ${
                  isSelected ? "ring-2 ring-[#486284]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => openConditionDetails(condition, isSelected)}
                  className="w-full flex items-center gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
                    <Icon
                      className={`size-5 ${isSelected ? "text-app-text-primary" : "text-app-text-muted"}`}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className="block font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-xs leading-tight"
                      style={{ fontVariationSettings: "'opsz' 14" }}
                    >
                      {condition}
                    </span>
                    <span className="block max-w-full truncate text-xs font-medium text-app-text-primary">
                      {displayDetail || (isSelected ? "Ausgewählt" : "Optional")}
                    </span>
                  </span>

                  <ChevronDown
                    className={`size-4 flex-shrink-0 text-app-text-primary/60 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isSelected && isOpen && (
                  <div className="mt-3 rounded-[10px] bg-white p-3">
                    {condition === "Sonstige" ? (
                      <div>
                        <Label htmlFor="otherCondition" className="mb-1 block text-xs font-bold text-app-text-primary">
                          Welche Vorerkrankung?
                        </Label>
                        <Input
                          id="otherCondition"
                          value={parsedCondition.detail}
                          onChange={(event) => updateConditionValue(condition, event.target.value)}
                          placeholder="Freitext"
                          className="h-9 border-none bg-[#eff2f6] text-xs"
                        />
                      </div>
                    ) : (
                      config && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-app-text-primary">{config.label}</p>
                          <div className="grid grid-cols-1 gap-1">
                            {config.options.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateConditionValue(condition, option)}
                                className={`w-full rounded-[8px] p-2 text-left transition-all ${
                                  parsedCondition.detail === option
                                    ? "bg-[#486284] text-white"
                                    : "bg-[#eff2f6] text-app-text-body hover:bg-[#dde3ea]"
                                }`}
                              >
                                <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm">
                                  {option}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    <div className="mt-3">
                      <p className="mb-2 text-xs font-bold text-app-text-primary">Seit wann?</p>
                      <DurationInputGroup
                        idPrefix={`condition-${condition}`}
                        duration={parsedCondition.duration}
                        allowSinceBirth={allowSinceBirth}
                        onChange={(duration) => updateConditionValue(condition, undefined, duration)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCondition(condition)}
                      className="mt-3 w-full rounded-[10px] border border-[#d7dee7] bg-white p-2 text-sm font-bold text-app-text-primary hover:bg-[#eff2f6]"
                    >
                      Auswahl entfernen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 mb-5 flex justify-end">
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
