import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Baby, Check, HeartPulse } from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import { useAssessment } from "../lib/AssessmentContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { PatientData } from "../types/assessment";

const HEIGHT_MIN = 40;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 1;
const WEIGHT_MAX = 1000;
const BIRTH_MONTH_MIN = 1;
const BIRTH_MONTH_MAX = 12;
const MAX_PATIENT_AGE_YEARS = 125;

type PatientDataForm = PatientData & {
smokerStatus?: string;
takesBloodThinners?: boolean;
immuneSystemStatus?: string;
immuneSystemDetails?: string;
drugDetails?: string;

};

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

function isNumberInRange(value: string, min: number, max: number) {
  const numberValue = Number(value);
  return value !== "" && Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

function isBirthDateValid(birthMonth: string, birthYear: string, currentMonth: number, currentYear: number) {
  const month = Number(birthMonth);
  const year = Number(birthYear);
  const minYear = currentYear - MAX_PATIENT_AGE_YEARS;

  if (!Number.isFinite(month) || !Number.isFinite(year)) {
    return false;
  }

  if (month < BIRTH_MONTH_MIN || month > BIRTH_MONTH_MAX) {
    return false;
  }

  if (year < minYear || year > currentYear) {
    return false;
  }

  if (year === currentYear && month > currentMonth) {
    return false;
  }

  return true;
}

function calculateBmi(height: string, weight: string) {
  const heightInCm = Number(height);
  const weightInKg = Number(weight);

  if (!Number.isFinite(heightInCm) || !Number.isFinite(weightInKg) || heightInCm <= 0 || weightInKg <= 0) {
    return null;
  }

  const heightInMeters = heightInCm / 100;
  return weightInKg / (heightInMeters * heightInMeters);
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) {
    return "Untergewicht";
  }

  if (bmi < 25) {
    return "Normalgewicht";
  }

  if (bmi < 30) {
    return "Übergewicht";
  }

  return "Adipositas";
}

function createInitialPatientData(patientData?: Partial<PatientDataForm>): PatientDataForm {
  return {
    birthMonth: "",
    birthYear: "",
    height: "",
    weight: "",
    gender: "",
    isPregnant: false,
    isBreastfeeding: false,
    smokerStatus: "Nicht angegeben",
    takesBloodThinners: false,
    immuneSystemStatus: "Nicht angegeben",
    allergies: "",
    medications: "",
    substanceInfluence: "Nein",
    recentAbroad: false,
    recentAbroadDetails: "",
    conditions: [],
    ...patientData,
  };
}

export default function PatientDataPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const birthYearMin = currentYear - MAX_PATIENT_AGE_YEARS;

  const [formData, setFormData] = useState<PatientDataForm>(() =>
    createInitialPatientData(patientData as Partial<PatientDataForm> | undefined)
  );

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const bmi = useMemo(() => calculateBmi(formData.height, formData.weight), [
    formData.height,
    formData.weight,
  ]);

  const shouldShowBmiFeedback =
    bmi !== null &&
    isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX) &&
    isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);

  const isFormValid =
    Boolean(formData.birthMonth && formData.birthYear && formData.gender) &&
    isBirthDateValid(formData.birthMonth, formData.birthYear, currentMonth, currentYear) &&
    isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX) &&
    isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);

  const hasBirthMonthError =
    (showValidationErrors || formData.birthMonth !== "") &&
    !isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX);

  const hasBirthYearError =
    (showValidationErrors || formData.birthYear !== "") &&
    !isNumberInRange(formData.birthYear, birthYearMin, currentYear);

  const hasFutureBirthDateError =
    (showValidationErrors || Boolean(formData.birthMonth && formData.birthYear)) &&
    isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX) &&
    isNumberInRange(formData.birthYear, birthYearMin, currentYear) &&
    !isBirthDateValid(formData.birthMonth, formData.birthYear, currentMonth, currentYear);

  const hasHeightError =
    (showValidationErrors || formData.height !== "") &&
    !isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX);

  const hasWeightError =
    (showValidationErrors || formData.weight !== "") &&
    !isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);

  const hasGenderError = showValidationErrors && !formData.gender;

  const handleContinue = () => {
    if (!isFormValid) {
      setShowValidationErrors(true);
      return;
    }

    setPatientData(formData);
    navigate("/medical-data");
  };

  return (
    <PageShell
      title="Bitte geben Sie Ihre Stammdaten ein"
      subtitle="Diese Informationen helfen uns, Sie optimal zu beraten."
      onBack={() => navigate("/")}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#eff2f6] rounded-[14px] p-3">
          <Label
            htmlFor="birthMonth"
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-1.5 block"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Geburtsdatum
          </Label>

          <div className="flex gap-1.5">
            <div className="flex-1">
              <Input
                id="birthMonth"
                type="number"
                placeholder="MM"
                min={BIRTH_MONTH_MIN}
                max={BIRTH_MONTH_MAX}
                value={formData.birthMonth}
                onChange={(event) => setFormData({ ...formData, birthMonth: event.target.value })}
                aria-invalid={hasBirthMonthError || hasFutureBirthDateError}
                className={`bg-white text-xs h-8 ${
                  hasBirthMonthError || hasFutureBirthDateError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5">
                Monat
              </p>
            </div>

            <div className="flex-1">
              <Input
                id="birthYear"
                type="number"
                placeholder="JJJJ"
                min={birthYearMin}
                max={currentYear}
                value={formData.birthYear}
                onChange={(event) => setFormData({ ...formData, birthYear: event.target.value })}
                aria-invalid={hasBirthYearError || hasFutureBirthDateError}
                className={`bg-white text-xs h-8 ${
                  hasBirthYearError || hasFutureBirthDateError
                    ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                    : "border-none"
                }`}
              />
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5">
                Jahr
              </p>
            </div>
          </div>

          {hasBirthMonthError && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Bitte Monat zwischen 1 und 12 wählen.
            </p>
          )}

          {hasBirthYearError && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Bitte Jahr zwischen {birthYearMin} und {currentYear} angeben.
            </p>
          )}

          {hasFutureBirthDateError && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Das Geburtsdatum darf nicht in der Zukunft liegen.
            </p>
          )}
        </div>

        <div className="bg-[#eff2f6] rounded-[14px] p-3">
          <Label
            htmlFor="height"
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-1.5 block"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Körpergröße & Gewicht
          </Label>

          <div className="flex flex-col gap-2">
            <div>
              <div className="flex flex-row gap-2">
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  min={HEIGHT_MIN}
                  max={HEIGHT_MAX}
                  value={formData.height}
                  onChange={(event) => setFormData({ ...formData, height: event.target.value })}
                  aria-invalid={hasHeightError}
                  className={`bg-white text-xs h-8 ${
                    hasHeightError
                      ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                      : "border-none"
                  }`}
                />
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-2">
                  cm
                </p>
              </div>

              {hasHeightError && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Bitte Körpergröße zwischen {HEIGHT_MIN} und {HEIGHT_MAX} cm angeben.
                </p>
              )}
            </div>

            <div>
              <div className="flex flex-row gap-2">
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  min={WEIGHT_MIN}
                  max={WEIGHT_MAX}
                  value={formData.weight}
                  onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
                  aria-invalid={hasWeightError}
                  className={`bg-white text-xs h-8 ${
                    hasWeightError
                      ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                      : "border-none"
                  }`}
                />
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-2">
                  kg
                </p>
              </div>

              {hasWeightError && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Bitte Gewicht zwischen {WEIGHT_MIN} und {WEIGHT_MAX} kg angeben.
                </p>
              )}
            </div>

            {shouldShowBmiFeedback && bmi !== null && (
              <p className="rounded-[10px] bg-white px-3 py-2 text-xs font-medium text-[#486284]">
                Ihr BMI beträgt {bmi.toFixed(1)} - {getBmiCategory(bmi)}.
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#eff2f6] rounded-[14px] p-3">
          <p
            className={`font-['DM_Sans:Bold',sans-serif] font-bold text-sm mb-1.5 ${
              hasGenderError ? "text-red-700" : "text-[#3e3e3e]"
            }`}
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Bei Geburt zugewiesenes Geschlecht
          </p>

          <div className="flex flex-col gap-1">
            {["Männlich", "Weiblich"].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    gender,
                    isPregnant: false,
                    isBreastfeeding: false,
                  })
                }
                className={`p-2 rounded-[8px] text-left transition-all ${
                  formData.gender === gender
                    ? "bg-[#486284] text-white"
                    : `bg-white text-[#3e3e3e] hover:bg-[#dde3ea] ${
                        hasGenderError ? "border border-red-200" : ""
                      }`
                }`}
              >
                <span
                  className="font-['DM_Sans:Medium',sans-serif] font-medium text-xs"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {gender}
                </span>
              </button>
            ))}
          </div>

          {hasGenderError && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              Bitte Geschlecht auswählen.
            </p>
          )}
        </div>
      </div>

      {formData.gender === "Weiblich" && (
        <div className="mt-3 bg-[#eff2f6] rounded-[14px] p-3">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-2"
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
                    isSelected
                      ? "bg-[#486284] text-white"
                      : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                  }`}
                >
                  <Icon
                    className={`size-5 flex-shrink-0 ${isSelected ? "text-white" : "text-[#486284]"}`}
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
