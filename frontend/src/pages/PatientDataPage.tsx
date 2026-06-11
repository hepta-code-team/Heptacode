import { useEffect, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useNavigate } from "react-router";
import { Annoyed, Frown, Laugh, Mars, Meh, Smile, Transgender, Venus, type LucideIcon } from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { PatientData } from "../../../shared/patientData.types";

const WEIGHT_MIN = 3;
const WEIGHT_MAX = 300;
const WEIGHT_DEFAULT = 70;
const HEIGHT_MIN = 45;
const HEIGHT_MAX = 250;
const HEIGHT_DEFAULT = 175;
const BIRTH_YEAR_DEFAULT = 2000;
const NUMBER_INPUT_SPIN_BUTTON_WIDTH = 28;
const BIRTH_MONTH_MIN = 1;
const BIRTH_MONTH_MAX = 12;
const MAX_PATIENT_AGE_YEARS = 125;

const GENDER_OPTIONS: Array<{
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = [
  {
    label: "Männlich",
    icon: Mars,
    color: "#486284",
    bgColor: "#e8eef7",
  },
  {
    label: "Weiblich",
    icon: Venus,
    color: "#ec4899",
    bgColor: "#fce7f3",
  },
  {
    label: "Divers",
    icon: Transgender,
    color: "#7c3aed",
    bgColor: "#ede9fe",
  },
];

const MOOD_OPTIONS: Array<{ label: string; icon: LucideIcon; color: string; bgColor: string }> = [
  { label: "Sehr schlecht", icon: Frown, color: "#EF4444", bgColor: "#FEE2E2" },
  { label: "Schlecht", icon: Annoyed, color: "#F97316", bgColor: "#FFEDD5" },
  { label: "Mittel", icon: Meh, color: "#EAB308", bgColor: "#FEF9C3" },
  { label: "Gut", icon: Smile, color: "#84CC16", bgColor: "#ECFCCB" },
  { label: "Sehr gut", icon: Laugh, color: "#10B981", bgColor: "#D1FAE5" },
];

function isNumberInRange(value: string, min: number, max: number) {
  const numberValue = Number(value);
  return value !== "" && Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getRequiredFieldCardClass(isCompleted: boolean, spacingClass = "h-full", borderClassName = "border-gray-400") {
  return `${spacingClass} rounded-[14px] border-2 p-3 transition-all ${
    isCompleted ? `${borderClassName} bg-[#eff2f6]` : "border-transparent bg-[#eff2f6]"
  }`;
}

/**
 * Creates the patient-data form state with persisted context values applied.
 *
 * Every field starts as a controlled value so validation, navigation, and later
 * medical-data steps can rely on a complete PatientData object.
 */
const createInitialPatientData = (patientData?: Partial<PatientData>): PatientData => ({
  birthMonth: "",
  birthYear: "",
  height: "",
  weight: "",
  gender: "",
  mood: "",
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
  ...patientData,
});

export default function PatientDataPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();
  const currentYear = new Date().getFullYear();
  const birthYearMin = currentYear - MAX_PATIENT_AGE_YEARS;

  const [formData, setFormData] = useState<PatientData>(() => createInitialPatientData(patientData ?? undefined));
  const [mood, setMood] = useState(formData.mood ?? "");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  /**
   * Validates only the required demographic fields for the first step.
   *
   * Optional clinical information is collected on the next page, so this screen
   * only blocks navigation for missing or unrealistic core patient data.
   */
  const isFormValid =
    Boolean(formData.birthMonth && formData.birthYear && formData.gender) &&
    isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX) &&
    isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX) &&
    isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX) &&
    isNumberInRange(formData.birthYear, birthYearMin, currentYear);

  const hasHeightError =
    (showValidationErrors || formData.height !== "") && !isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX);
  const hasWeightError =
    (showValidationErrors || formData.weight !== "") && !isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);
  const hasBirthMonthError =
    (showValidationErrors || formData.birthMonth !== "") &&
    !isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX);
  const hasBirthYearError =
    (showValidationErrors || formData.birthYear !== "") &&
    !isNumberInRange(formData.birthYear, birthYearMin, currentYear);
  const hasGenderError = showValidationErrors && !formData.gender;
  const isBirthDateComplete =
    isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX) &&
    isNumberInRange(formData.birthYear, birthYearMin, currentYear);
  const isBodyMeasureComplete =
    isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX) &&
    isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);
  const isGenderComplete = Boolean(formData.gender);

  useEffect(() => {
    setPatientData({ ...formData, mood });
  }, [formData, mood, setPatientData]);

  const setEmptyNumberStepValue = (
    field: "birthYear" | "height" | "weight",
    defaultValue: number,
    direction: 1 | -1,
    min: number,
    max: number,
  ) => {
    if (formData[field] !== "") {
      return false;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: String(clampNumber(defaultValue + direction, min, max)),
    }));
    return true;
  };

  /**
   * Starts empty number fields from the expected neutral examples when users
   * use the native up/down controls instead of typing a value manually.
   */
  const handleEmptyNumberKeyStep = (
    event: KeyboardEvent<HTMLInputElement>,
    field: "birthYear" | "height" | "weight",
    defaultValue: number,
    min: number,
    max: number,
  ) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    const direction = event.key === "ArrowUp" ? 1 : -1;

    if (setEmptyNumberStepValue(field, defaultValue, direction, min, max)) {
      event.preventDefault();
    }
  };

  const handleEmptyNumberPointerStep = (
    event: PointerEvent<HTMLInputElement>,
    field: "birthYear" | "height" | "weight",
    defaultValue: number,
    min: number,
    max: number,
  ) => {
    if (formData[field] !== "") {
      return;
    }

    const inputRect = event.currentTarget.getBoundingClientRect();
    const isSpinButtonClick = event.clientX >= inputRect.right - NUMBER_INPUT_SPIN_BUTTON_WIDTH;

    if (!isSpinButtonClick) {
      return;
    }

    const direction = event.clientY <= inputRect.top + inputRect.height / 2 ? 1 : -1;

    event.preventDefault();
    event.currentTarget.focus();
    setEmptyNumberStepValue(field, defaultValue, direction, min, max);
  };

  const handleContinue = () => {
    if (!isFormValid) {
      setShowValidationErrors(true);
      return;
    }

    setPatientData({ ...formData, mood });
    navigate("/medical-data");
  };

  /**
   * Updates gender and clears pregnancy-related fields when they no longer apply.
   *
   * This prevents stale pregnancy or breastfeeding values from remaining in the
   * shared assessment context after a user changes gender.
   */
  const setGender = (gender: string) => {
    const nextGender = formData.gender === gender ? "" : gender;

    setFormData({
      ...formData,
      gender: nextGender,
      isPregnant: nextGender === "Weiblich" ? formData.isPregnant : false,
      isBreastfeeding: nextGender === "Weiblich" ? formData.isBreastfeeding : false,
    });
  };

  return (
    <PageShell
      title="Bitte geben Sie Ihre Stammdaten ein"
      subtitle="Diese Informationen helfen uns, Sie optimal zu beraten."
      onBack={() => navigate("/")}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.1fr_1.5fr] md:items-stretch">
        <div className={getRequiredFieldCardClass(isBirthDateComplete)}>
          <Label
            htmlFor="birthMonth"
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1.5 block"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Geburtsdatum <span className="text-app-text-danger">*</span>
          </Label>
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Input
                id="birthMonth"
                type="number"
                placeholder="MM"
                min="1"
                max="12"
                value={formData.birthMonth}
                onChange={(event) => setFormData({ ...formData, birthMonth: event.target.value })}
                className={`bg-white text-xs h-8 ${
                  hasBirthMonthError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5">
                Monat
              </p>
              {hasBirthMonthError && (
                <p id="birth-month-error" className="mt-1 text-xs font-medium text-app-text-danger">
                  Bitte Monat zwischen 1-12 wählen.
                </p>
              )}
            </div>

            <div className="flex-1">
              <Input
                id="birthYear"
                type="number"
                placeholder="JJJJ"
                min={birthYearMin}
                max={currentYear}
                aria-invalid={hasBirthYearError}
                aria-describedby={hasBirthYearError ? "birth-year-error" : undefined}
                value={formData.birthYear}
                onChange={(event) => setFormData({ ...formData, birthYear: event.target.value })}
                onKeyDown={(event) =>
                  handleEmptyNumberKeyStep(event, "birthYear", BIRTH_YEAR_DEFAULT, birthYearMin, currentYear)
                }
                onPointerDown={(event) =>
                  handleEmptyNumberPointerStep(event, "birthYear", BIRTH_YEAR_DEFAULT, birthYearMin, currentYear)
                }
                className={`bg-white text-xs h-8 ${
                  hasBirthYearError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5">
                Jahr
              </p>
              {hasBirthYearError && (
                <p id="birth-year-error" className="mt-1 text-xs font-medium text-app-text-danger">
                  Bitte Jahr zwischen {birthYearMin}-{currentYear} angeben.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={getRequiredFieldCardClass(isBodyMeasureComplete)}>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1.5"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Größe & Gewicht <span className="text-app-text-danger">*</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="height" className="sr-only">
                Größe
              </Label>
              <Input
                id="height"
                type="number"
                placeholder="zB. 175"
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                aria-invalid={hasHeightError}
                aria-describedby={hasHeightError ? "height-error" : undefined}
                value={formData.height}
                onChange={(event) => setFormData({ ...formData, height: event.target.value })}
                onKeyDown={(event) =>
                  handleEmptyNumberKeyStep(event, "height", HEIGHT_DEFAULT, HEIGHT_MIN, HEIGHT_MAX)
                }
                onPointerDown={(event) =>
                  handleEmptyNumberPointerStep(event, "height", HEIGHT_DEFAULT, HEIGHT_MIN, HEIGHT_MAX)
                }
                className={`bg-white text-xs h-8 ${
                  hasHeightError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5">
                cm
              </p>
              {hasHeightError && (
                <p id="height-error" className="mt-1 text-xs font-medium text-app-text-danger">
                  Bitte Größe zwischen {HEIGHT_MIN}-{HEIGHT_MAX} cm angeben.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="weight" className="sr-only">
                Gewicht
              </Label>
              <Input
                id="weight"
                type="number"
                placeholder="zB. 70"
                min={WEIGHT_MIN}
                max={WEIGHT_MAX}
                aria-invalid={hasWeightError}
                aria-describedby={hasWeightError ? "weight-error" : undefined}
                value={formData.weight}
                onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                onKeyDown={(event) =>
                  handleEmptyNumberKeyStep(event, "weight", WEIGHT_DEFAULT, WEIGHT_MIN, WEIGHT_MAX)
                }
                onPointerDown={(event) =>
                  handleEmptyNumberPointerStep(event, "weight", WEIGHT_DEFAULT, WEIGHT_MIN, WEIGHT_MAX)
                }
                className={`bg-white text-xs h-8 ${
                  hasWeightError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5">
                kg
              </p>
              {hasWeightError && (
                <p id="weight-error" className="mt-1 text-xs font-medium text-app-text-danger">
                  Bitte Gewicht zwischen {WEIGHT_MIN}-{WEIGHT_MAX} kg angeben.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={getRequiredFieldCardClass(isGenderComplete)}>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1.5"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Bei Geburt zugewiesenes Geschlecht <span className="text-app-text-danger">*</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {GENDER_OPTIONS.map(({ label: gender, icon: Icon, color, bgColor }) => {
              const isSelected = formData.gender === gender;

              return (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setGender(gender)}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[8px] border px-2 py-2 text-center text-app-text-body transition-all hover:opacity-90 ${
                    hasGenderError && !isSelected ? "border-red-200" : ""
                  }`}
                  style={{
                    backgroundColor: isSelected ? bgColor : "#ffffff",
                    borderColor: isSelected ? color : hasGenderError ? undefined : "transparent",
                    boxShadow: isSelected ? `0 0 0 2px ${color}33` : "none",
                  }}
                >
                  <Icon className="size-4 flex-shrink-0" color={color} strokeWidth={2.3} aria-hidden="true" />
                  <span
                    className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-xs leading-tight sm:text-sm"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {gender}
                  </span>
                </button>
              );
            })}
          </div>
          {hasGenderError && (
            <p className="mt-1.5 text-xs font-medium text-app-text-danger">
              Bitte Geschlecht auswählen.
            </p>
          )}
        </div>
      </div>

      <div className={getRequiredFieldCardClass(Boolean(mood), "mt-3")}>
        <div className="mb-2">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Wie ist Ihre aktuelle Stimmung heute?
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 sm:grid sm:grid-cols-5">
          {MOOD_OPTIONS.map(({ label, icon: Icon, color, bgColor }) => {
            const isSelected = mood === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setMood(isSelected ? "" : label)}
                className="flex min-h-11 w-[calc((100%-0.75rem)/3)] items-center justify-center gap-1 rounded-[10px] border px-1.5 py-2 text-center text-app-text-body transition-all hover:opacity-90 sm:w-auto sm:gap-1.5 sm:px-2"
                style={{
                  backgroundColor: isSelected ? bgColor : "#ffffff",
                  borderColor: isSelected ? color : "transparent",
                  boxShadow: isSelected ? `0 0 0 2px ${color}33` : "none",
                }}
              >
                <Icon
                  className="size-4 flex-shrink-0"
                  color={color}
                  strokeWidth={2.3}
                  aria-hidden="true"
                />
                <span
                  className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-xs leading-tight"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {label}
                </span>
              </button>
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