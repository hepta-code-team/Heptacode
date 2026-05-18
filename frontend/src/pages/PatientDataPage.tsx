import {useState} from "react";
import type {ReactNode} from "react";
import {useNavigate} from "react-router";
import {
    Activity,
    Baby,
    Check,
    ChevronDown,
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
const MAX_PATIENT_AGE_YEARS = 125;
const conditionIcons = {
    Diabetes: Droplets,
    Bluthochdruck: Activity,
    Herzerkrankungen: HeartPulse,
    "Asthma/COPD": Wind,
    Nierenerkrankungen: ShieldAlert,
    Lebererkrankungen: Stethoscope,
    Epilepsie: Pill,
    Sonstige: CircleHelp,
};
type MedicalSection = "allergies" | "medications" | "substance" | "abroad";

function MedicalAccordionPanel({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    summary,
    children,
}: {
    title: string;
    icon: LucideIcon;
    isOpen: boolean;
    onToggle: () => void;
    summary: string;
    children: ReactNode;
}) {
    return (
        <div className="bg-[#eff2f6] rounded-[14px] p-3">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 text-left"
                aria-expanded={isOpen}
            >
                <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-app-text-primary">
                    <Icon className="size-5" aria-hidden="true"/>
                </span>
                <span className="min-w-0 flex-1">
                    <span
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm block"
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        {title}
                    </span>
                    <span
                        className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs block truncate"
                        style={{fontVariationSettings: "'opsz' 14"}}
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

function SelectionMark({selected}: { selected: boolean }) {
    return (
        <span
            className={`flex size-5 flex-shrink-0 items-center justify-center rounded-[6px] border-2 transition-all ${
                selected ? "border-current bg-white/20" : "border-[#828b93]"
            }`}
            aria-hidden="true"
        >
            {selected && <Check className="size-3.5" strokeWidth={3}/>}
        </span>
    );
}

function isNumberInRange(value: string, min: number, max: number) {
    const numberValue = Number(value);
    return value !== "" && Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

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
    ...patientData,
});

export default function PatientDataPage() {
    const navigate = useNavigate();
    const {patientData, setPatientData} = useAssessment();
    const currentYear = new Date().getFullYear();
    const birthYearMin = currentYear - MAX_PATIENT_AGE_YEARS;

    const [formData, setFormData] = useState<PatientData>(() => createInitialPatientData(patientData ?? undefined));
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [expandedMedicalSections, setExpandedMedicalSections] = useState<Record<MedicalSection, boolean>>({
        allergies: false,
        medications: false,
        substance: false,
        abroad: false,
    });

    const toggleMedicalSection = (section: MedicalSection) => {
        setExpandedMedicalSections((sections) => ({
            ...sections,
            [section]: !sections[section],
        }));
    };

    const toggleCondition = (condition: string) => {
        setFormData((prev) => ({
            ...prev,
            conditions: prev.conditions.includes(condition)
                ? prev.conditions.filter((c) => c !== condition)
                : [...prev.conditions, condition],
        }));
    };

    const handleContinue = () => {
        if (!isFormValid) {
            setShowValidationErrors(true);
            return;
        }

        setPatientData(formData);
        navigate("/symptom-selection");
    };

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
        (showValidationErrors || formData.birthMonth !== "") && !isNumberInRange(formData.birthMonth, BIRTH_MONTH_MIN, BIRTH_MONTH_MAX);
    const hasBirthYearError =
        (showValidationErrors || formData.birthYear !== "") && !isNumberInRange(formData.birthYear, birthYearMin, currentYear);
    const hasGenderError = showValidationErrors && !formData.gender;

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
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1.5 block"
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
                                onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
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
                                    Bitte Jahr zwischen {birthYearMin} und {currentYear} angeben.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#eff2f6] rounded-[14px] p-3">
                    <Label
                        htmlFor="height"
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1.5 block"
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
                                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5"
                                    style={{fontVariationSettings: "'opsz' 14"}}
                                >
                                    cm
                                </p>
                            </div>
                            {hasHeightError && (
                                <p id="height-error" className="mt-1 text-xs font-medium text-app-text-danger">
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
                                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs mt-0.5"
                                    style={{fontVariationSettings: "'opsz' 14"}}
                                >
                                    kg
                                </p>
                            </div>
                            {hasWeightError && (
                                <p id="weight-error" className="mt-1 text-xs font-medium text-app-text-danger">
                                    Bitte Gewicht zwischen {WEIGHT_MIN} und {WEIGHT_MAX} kg angeben.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#eff2f6] rounded-[14px] p-3">
                    <p
                        className={`font-['DM_Sans:Bold',sans-serif] font-bold text-sm mb-1.5 ${
                            hasGenderError ? "text-app-text-danger-strong" : "text-app-text-body"
                        }`}
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Bei Geburt zugewiesenes Geschlecht
                    </p>
                    <div className="flex flex-col gap-1">
                        {["Männlich", "Weiblich"].map((gender) => (
                            <button
                                key={gender}
                                onClick={() => setFormData({...formData, gender, isPregnant: false, isBreastfeeding: false})}
                                className={`p-2 rounded-[8px] text-left transition-all ${
                                    formData.gender === gender
                                        ? "bg-[#486284] text-app-text-on-primary"
                                        : `bg-white text-app-text-body hover:bg-[#dde3ea] ${
                                            hasGenderError ? "border border-red-200" : ""
                                        }`
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
                    {hasGenderError && (
                        <p className="mt-1.5 text-xs font-medium text-app-text-danger">
                            Bitte Geschlecht auswählen.
                        </p>
                    )}
                </div>
            </div>

            {formData.gender === "Weiblich" && (
                <div className="mt-3 bg-[#eff2f6] rounded-[14px] p-3">
                    <p
                        className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-2"
                        style={{fontVariationSettings: "'opsz' 14"}}
                    >
                        Schwangerschaft / Stillen
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                            {key: "isPregnant", label: "Derzeit schwanger", icon: Baby},
                            {key: "isBreastfeeding", label: "Derzeit stillend", icon: HeartPulse},
                        ].map((item) => {
                            const key = item.key as "isPregnant" | "isBreastfeeding";
                            const Icon = item.icon;
                            const isSelected = formData[key];

                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setFormData({...formData, [key]: !formData[key]})}
                                    className={`w-full p-3 rounded-[12px] text-left transition-all flex items-center gap-3 ${
                                        isSelected
                                            ? "bg-[#486284] text-app-text-on-primary"
                                            : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                                    }`}
                                >
                                    <Icon
                                        className={`size-5 flex-shrink-0 ${isSelected ? "text-app-text-on-primary" : "text-app-text-primary"}`}
                                        aria-hidden="true"
                                    />
                                    <span
                                        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1"
                                        style={{fontVariationSettings: "'opsz' 14"}}
                                    >
                                      {item.label}
                                    </span>
                                    <SelectionMark selected={isSelected}/>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-4">
                <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-2"
                    style={{fontVariationSettings: "'opsz' 14"}}
                >
                    Weitere medizinische Angaben
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <MedicalAccordionPanel
                        title="Allergien / Unverträglichkeiten"
                        icon={CircleAlert}
                        isOpen={expandedMedicalSections.allergies}
                        onToggle={() => toggleMedicalSection("allergies")}
                        summary={formData.allergies ? "Angaben hinterlegt" : "Optional ergänzen"}
                    >
                        <Label
                            htmlFor="allergies"
                            className="sr-only"
                            style={{fontVariationSettings: "'opsz' 14"}}
                        >
                            Allergien / Unverträglichkeiten
                        </Label>
                        <textarea
                            id="allergies"
                            value={formData.allergies}
                            onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                            placeholder="z.B. Penicillin, Nüsse, Latex"
                            className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
                        />
                    </MedicalAccordionPanel>

                    <MedicalAccordionPanel
                        title="Aktuelle Medikamente"
                        icon={Pill}
                        isOpen={expandedMedicalSections.medications}
                        onToggle={() => toggleMedicalSection("medications")}
                        summary={formData.medications ? "Angaben hinterlegt" : "Optional ergänzen"}
                    >
                        <Label
                            htmlFor="medications"
                            className="sr-only"
                            style={{fontVariationSettings: "'opsz' 14"}}
                        >
                            Aktuelle Medikamente
                        </Label>
                        <textarea
                            id="medications"
                            value={formData.medications}
                            onChange={(e) => setFormData({...formData, medications: e.target.value})}
                            placeholder="z.B. Blutdruckmittel, Schmerzmittel, Pille"
                            className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
                        />
                    </MedicalAccordionPanel>

                    <MedicalAccordionPanel
                        title="Einfluss durch Alkohol, Drogen oder Medikamente"
                        icon={Wine}
                        isOpen={expandedMedicalSections.substance}
                        onToggle={() => toggleMedicalSection("substance")}
                        summary={formData.substanceInfluence === "Nein" ? "Nein ausgewählt" : formData.substanceInfluence}
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {["Nein", "Alkohol", "Drogen", "Medikamente"].map((option) => {
                                const isSelected = formData.substanceInfluence === option;

                                return (
                                    <button
                                        key={option}
                                        onClick={() => setFormData({...formData, substanceInfluence: option})}
                                        className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
                                            isSelected
                                                ? "bg-[#486284] text-app-text-on-primary"
                                                : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                                        }`}
                                    >
                                    <span
                                        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1"
                                        style={{fontVariationSettings: "'opsz' 14"}}
                                    >
                                      {option}
                                    </span>
                                        <SelectionMark selected={isSelected}/>
                                    </button>
                                );
                            })}
                        </div>
                    </MedicalAccordionPanel>

                    <MedicalAccordionPanel
                        title="Auslandsaufenthalt in den letzten 3 Monaten"
                        icon={Globe2}
                        isOpen={expandedMedicalSections.abroad}
                        onToggle={() => toggleMedicalSection("abroad")}
                        summary={formData.recentAbroad ? (formData.recentAbroadDetails || "Ja ausgewählt") : "Nein ausgewählt"}
                    >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {[
                                {label: "Nein", value: false},
                                {label: "Ja", value: true},
                            ].map((option) => {
                                const isSelected = formData.recentAbroad === option.value;

                                return (
                                    <button
                                        key={option.label}
                                        onClick={() => setFormData({
                                            ...formData,
                                            recentAbroad: option.value,
                                            recentAbroadDetails: option.value ? formData.recentAbroadDetails : "",
                                        })}
                                        className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
                                            isSelected
                                                ? "bg-[#486284] text-app-text-on-primary"
                                                : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                                        }`}
                                    >
                                    <span
                                        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1"
                                        style={{fontVariationSettings: "'opsz' 14"}}
                                    >
                                      {option.label}
                                    </span>
                                        <SelectionMark selected={isSelected}/>
                                    </button>
                                );
                            })}
                        </div>
                        {formData.recentAbroad && (
                            <Input
                                id="recentAbroadDetails"
                                value={formData.recentAbroadDetails}
                                onChange={(e) => setFormData({...formData, recentAbroadDetails: e.target.value})}
                                placeholder="Land / Region, falls bekannt"
                                className="bg-white border-none text-xs h-9"
                            />
                        )}
                    </MedicalAccordionPanel>
                </div>
            </div>

            <div className="mt-4">
                <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-2"
                    style={{fontVariationSettings: "'opsz' 14"}}
                >
                    Vorerkrankungen
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PRE_EXISTING_CONDITIONS.map((condition) => {
                        const Icon = conditionIcons[condition as keyof typeof conditionIcons] ?? CircleHelp;
                        const isSelected = formData.conditions.includes(condition);

                        return (
                            <button
                                key={condition}
                                onClick={() => toggleCondition(condition)}
                                className={`bg-[#eff2f6] rounded-[10px] p-3 min-h-[82px] flex flex-col items-center justify-center gap-2 text-center transition-all ${
                                    isSelected
                                        ? "ring-2 ring-[#486284]"
                                        : "hover:bg-[#dde3ea]"
                                }`}
                            >
                                <Icon
                                    className={`size-6 ${isSelected ? "text-app-text-primary" : "text-app-text-muted"}`}
                                    strokeWidth={2.2}
                                    aria-hidden="true"
                                />
                                <p
                                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-xs leading-tight"
                                    style={{fontVariationSettings: "'opsz' 14"}}
                                >
                                    {condition}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-5 mb-5 flex justify-end">
                <Button onClick={handleContinue}>
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
