import {useState} from "react";
import {useNavigate} from "react-router";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import {useAssessment} from "../lib/AssessmentContext";
import {Input} from "../components/ui/input";
import {Label} from "../components/ui/label";
import {PRE_EXISTING_CONDITIONS} from "../features/symptoms/symptoms.constants";
import type {PatientData} from "../types/assessment";

const HEIGHT_MIN = 50;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 3;
const WEIGHT_MAX = 300;
const BIRTH_MONTH_MIN = 1;
const BIRTH_MONTH_MAX = 12;

function isNumberInRange(value: string, min: number, max: number) {
    const numberValue = Number(value);
    return value !== "" && Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

export default function PatientDataPage() {
    const navigate = useNavigate();
    const {patientData, setPatientData} = useAssessment();
    const currentYear = new Date().getFullYear();

    const [formData, setFormData] = useState<PatientData>(
        patientData || {
            birthMonth: "",
            birthYear: "",
            height: "",
            weight: "",
            gender: "",
            isPregnant: false,
            conditions: [],
        }
    );

    const toggleCondition = (condition: string) => {
        setFormData((prev) => ({
            ...prev,
            conditions: prev.conditions.includes(condition)
                ? prev.conditions.filter((c) => c !== condition)
                : [...prev.conditions, condition],
        }));
    };

    const handleContinue = () => {
        setPatientData(formData);
        navigate("/symptom-selection");
    };

    const isFormValid =
        Boolean(formData.birthMonth && formData.birthYear && formData.gender) &&
        isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX) &&
        isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX) &&
        isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX);
    const hasHeightError = formData.height !== "" && !isNumberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX);
    const hasWeightError = formData.weight !== "" && !isNumberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);
    const hasBirthMonthError = formData.birthMonth!== "" && !isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX);

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
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Geburtsdatum
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
                                onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                                className={`bg-white text-xs h-8 ${
                                    hasBirthMonthError 
                                        ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                                        : "border-none"
                                }`}
                            />
                            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5">
                                Monat
                            </p>
                            {hasBirthMonthError && (
                                <p id="height-error" className="mt-1 text-xs font-medium text-red-600">
                                    Bitte Monat zwischen 1-12 wählen.
                                </p>
                            )}
                        </div>
                        <div className="flex-1">
                            <Input
                                id="birthYear"
                                type="number"
                                placeholder="JJJJ"
                                min="1900"
                                max={currentYear}
                                value={formData.birthYear}
                                onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                                className="bg-white border-none text-xs h-8"
                            />
                            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5">
                                Jahr
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#eff2f6] rounded-[14px] p-3">
                    <Label
                        htmlFor="height"
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-1.5 block"
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Körpergröße & Gewicht
                    </Label>
                    <div className="flex flex-col gap-1">
                        <div>
                            <div className="flex flex-row gap-2">
                                <Input
                                    id="height"
                                    type="number"
                                    placeholder="175"
                                    min={HEIGHT_MIN}
                                    max={HEIGHT_MAX}
                                    aria-invalid={hasHeightError}
                                    aria-describedby={hasHeightError ? "height-error" : undefined}
                                    value={formData.height}
                                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                                    className={`bg-white text-xs h-8 ${
                                        hasHeightError
                                            ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                                            : "border-none"
                                    }`}
                                />
                                <p
                                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5"
                                    style={{fontVariationSettings: "'opsz' 14"}}
                                >
                                    cm
                                </p>
                            </div>
                            {hasHeightError && (
                                <p id="height-error" className="mt-1 text-xs font-medium text-red-600">
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
                                    aria-invalid={hasWeightError}
                                    aria-describedby={hasWeightError ? "weight-error" : undefined}
                                    value={formData.weight}
                                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                                    className={`bg-white text-xs h-8 ${
                                        hasWeightError
                                            ? "border border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                                            : "border-none"
                                    }`}
                                />
                                <p
                                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs mt-0.5"
                                    style={{fontVariationSettings: "'opsz' 14"}}
                                >
                                    kg
                                </p>
                            </div>
                            {hasWeightError && (
                                <p id="weight-error" className="mt-1 text-xs font-medium text-red-600">
                                    Bitte Gewicht zwischen {WEIGHT_MIN} und {WEIGHT_MAX} kg angeben.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#eff2f6] rounded-[14px] p-3">
                    <p
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-1.5"
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Bei Geburt zugewiesenes Geschlecht
                    </p>
                    <div className="flex flex-col gap-1">
                        {["Männlich", "Weiblich"].map((gender) => (
                            <button
                                key={gender}
                                onClick={() => setFormData({...formData, gender, isPregnant: false})}
                                className={`p-2 rounded-[8px] text-left transition-all ${
                                    formData.gender === gender
                                        ? "bg-[#486284] text-white"
                                        : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                                }`}
                            >
                <span
                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-xs"
                    style={{fontVariationSettings: "'opsz' 14"}}
                >
                  {gender}
                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {formData.gender === "Weiblich" && (
                <div className="mt-3 bg-[#eff2f6] rounded-[14px] p-3">
                    <button
                        onClick={() => setFormData({...formData, isPregnant: !formData.isPregnant})}
                        className={`w-full p-2 rounded-[10px] text-left transition-all ${
                            formData.isPregnant
                                ? "bg-[#486284] text-white"
                                : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                        }`}
                    >
            <span
                className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm"
                style={{fontVariationSettings: "'opsz' 14"}}
            >
              Derzeit schwanger
            </span>
                    </button>
                </div>
            )}

            <div className="mt-4">
                <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-2"
                    style={{fontVariationSettings: "'opsz' 14"}}
                >
                    Vorerkrankungen
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PRE_EXISTING_CONDITIONS.map((condition) => (
                        <button
                            key={condition}
                            onClick={() => toggleCondition(condition)}
                            className={`bg-[#eff2f6] rounded-[10px] p-2 h-[65px] flex items-center justify-center text-center transition-all ${
                                formData.conditions.includes(condition)
                                    ? "ring-2 ring-[#486284]"
                                    : "hover:bg-[#dde3ea]"
                            }`}
                        >
                            <p
                                className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-xs"
                                style={{fontVariationSettings: "'opsz' 14"}}
                            >
                                {condition}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 mb-5 flex justify-end">
                <Button onClick={handleContinue} disabled={!isFormValid}>
                    <p
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Weiter
                    </p>
                </Button>
            </div>
        </PageShell>
    );
}
