import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Activity,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Cigarette,
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAssessment } from "../lib/AssessmentContext";
import { PRE_EXISTING_CONDITIONS } from "../features/symptoms/symptoms.constants";
import type { PatientData } from "../types/assessment";

type MedicalSection = "abroad" | "substance" | "allergies" | "medications";

type MedicalPatientData = PatientData & {
  smokerStatus?: string;
  takesBloodThinners?: boolean;
  immuneSystemStatus?: string;
  immuneSystemDetails?: string;
  drugDetails?: string;
};

const conditionOptions = ["Keine Vorerkrankung", ...PRE_EXISTING_CONDITIONS];

const conditionIcons: Record<string, LucideIcon> = {
  "Keine Vorerkrankung": Check,
  Diabetes: Droplets,
  Bluthochdruck: Activity,
  Herzerkrankungen: HeartPulse,
  "Asthma/COPD": Wind,
  Nierenerkrankungen: ShieldAlert,
  Lebererkrankungen: Stethoscope,
  Epilepsie: Pill,
  Sonstige: CircleHelp,
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

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full bg-white text-[#486284] hover:bg-[#dde3ea]"
      aria-label="Weitere Informationen anzeigen"
    >
      <CircleHelp className="size-4" aria-hidden="true" />
    </button>
  );
}

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
        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#486284]">
          <Icon className="size-5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm block"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {title}
          </span>
          <span
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs block truncate"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {summary}
          </span>
        </span>

        <ChevronDown
          className={`size-5 flex-shrink-0 text-[#486284] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

function createInitialPatientData(patientData?: Partial<MedicalPatientData>): MedicalPatientData {
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
    immuneSystemDetails: "",
    drugDetails: "",
    allergies: "",
    medications: "",
    substanceInfluence: "Nein",
    recentAbroad: false,
    recentAbroadDetails: "",
    conditions: [],
    ...patientData,
  };
}

export default function MedicalDataPage() {
  const navigate = useNavigate();
  const { patientData, setPatientData } = useAssessment();

  const [formData, setFormData] = useState<MedicalPatientData>(() =>
    createInitialPatientData(patientData as Partial<MedicalPatientData> | undefined)
  );

  const [showBloodThinnerInfo, setShowBloodThinnerInfo] = useState(false);
  const [showImmuneInfo, setShowImmuneInfo] = useState(false);

  const [expandedMedicalSections, setExpandedMedicalSections] = useState<Record<MedicalSection, boolean>>({
    abroad: false,
    substance: false,
    allergies: false,
    medications: false,
  });

  const toggleMedicalSection = (section: MedicalSection) => {
    setExpandedMedicalSections((sections) => ({
      ...sections,
      [section]: !sections[section],
    }));
  };

  const toggleCondition = (condition: string) => {
    setFormData((currentData) => {
      if (condition === "Keine Vorerkrankung") {
        return {
          ...currentData,
          conditions: currentData.conditions.includes(condition) ? [] : ["Keine Vorerkrankung"],
        };
      }

      const conditionsWithoutNone = currentData.conditions.filter((item) => item !== "Keine Vorerkrankung");

      return {
        ...currentData,
        conditions: conditionsWithoutNone.includes(condition)
          ? conditionsWithoutNone.filter((item) => item !== condition)
          : [...conditionsWithoutNone, condition],
      };
    });
  };

  const handleContinue = () => {
    setPatientData(formData);
    navigate("/symptom-selection");
  };

  return (
    <PageShell
      title="Weitere medizinische Angaben"
      subtitle="Diese Angaben helfen uns, Risiken besser einzuschätzen."
      onBack={() => navigate("/patient-data")}
    >
      <div className="mt-2">
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-2"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Risikofaktoren
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#eff2f6] rounded-[14px] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Cigarette className="size-5 text-[#486284]" aria-hidden="true" />
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                Raucherstatus
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {["Nichtraucher", "Raucher", "Ehemaliger Raucher"].map((status) => {
                const isSelected = formData.smokerStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, smokerStatus: status })}
                    className={`p-2 rounded-[8px] text-left transition-all ${
                      isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                    }`}
                  >
                    <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-xs">
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#eff2f6] rounded-[14px] p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CircleAlert className="size-5 text-[#486284]" aria-hidden="true" />
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                  Blutverdünner
                </p>
              </div>
              <InfoButton onClick={() => setShowBloodThinnerInfo(!showBloodThinnerInfo)} />
            </div>

            {showBloodThinnerInfo && (
              <p className="mb-2 rounded-[10px] bg-white px-3 py-2 text-xs font-medium text-[#486284]">
                Dazu zählen z.B. Marcumar, Warfarin, Heparin, ASS, Clopidogrel, Apixaban, Rivaroxaban,
                Edoxaban oder Dabigatran.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Nein", value: false },
                { label: "Ja", value: true },
              ].map((option) => {
                const isSelected = formData.takesBloodThinners === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, takesBloodThinners: option.value })}
                    className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
                      isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                    }`}
                  >
                    <span className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1">
                      {option.label}
                    </span>
                    <SelectionMark selected={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#eff2f6] rounded-[14px] p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-[#486284]" aria-hidden="true" />
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                  Immunsystem
                </p>
              </div>
              <InfoButton onClick={() => setShowImmuneInfo(!showImmuneInfo)} />
            </div>

            {showImmuneInfo && (
              <p className="mb-2 rounded-[10px] bg-white px-3 py-2 text-xs font-medium text-[#486284]">
                Ein geschwächtes Immunsystem kann z.B. durch Chemotherapie, Kortisontherapie,
                Organtransplantation, HIV, schwere chronische Erkrankungen oder immunsuppressive Medikamente entstehen.
              </p>
            )}

            <div className="flex flex-col gap-1">
              {["Unauffällig", "Geschwächt", "Nicht bekannt"].map((status) => {
                const isSelected = formData.immuneSystemStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        immuneSystemStatus: status,
                        immuneSystemDetails: status === "Geschwächt" ? formData.immuneSystemDetails : "",
                      })
                    }
                    className={`p-2 rounded-[8px] text-left transition-all ${
                      isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                    }`}
                  >
                    <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-xs">
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>

            {formData.immuneSystemStatus === "Geschwächt" && (
              <Input
                value={formData.immuneSystemDetails}
                onChange={(event) => setFormData({ ...formData, immuneSystemDetails: event.target.value })}
                placeholder="z.B. Chemotherapie, Kortison, HIV"
                className="mt-2 bg-white border-none text-xs h-9"
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-2">
          Vorerkrankungen
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {conditionOptions.map((condition) => {
            const Icon = conditionIcons[condition] ?? CircleHelp;
            const isSelected = formData.conditions.includes(condition);

            return (
              <button
                key={condition}
                type="button"
                onClick={() => toggleCondition(condition)}
                className={`bg-[#eff2f6] rounded-[10px] p-3 min-h-[82px] flex flex-col items-center justify-center gap-2 text-center transition-all ${
                  isSelected ? "ring-2 ring-[#486284]" : "hover:bg-[#dde3ea]"
                }`}
              >
                <Icon
                  className={`size-6 ${isSelected ? "text-[#486284]" : "text-[#828b93]"}`}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-xs leading-tight">
                  {condition}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-2">
          Ergänzende medizinisch relevante Informationen
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <MedicalAccordionPanel
            title="Auslandsaufenthalte"
            icon={Globe2}
            isOpen={expandedMedicalSections.abroad}
            onToggle={() => toggleMedicalSection("abroad")}
            summary={formData.recentAbroad ? formData.recentAbroadDetails || "Ja ausgewählt" : "Nein ausgewählt"}
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: "Nein", value: false },
                { label: "Ja", value: true },
              ].map((option) => {
                const isSelected = formData.recentAbroad === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        recentAbroad: option.value,
                        recentAbroadDetails: option.value ? formData.recentAbroadDetails : "",
                      })
                    }
                    className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
                      isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                    }`}
                  >
                    <span className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1">
                      {option.label}
                    </span>
                    <SelectionMark selected={isSelected} />
                  </button>
                );
              })}
            </div>

            {formData.recentAbroad && (
              <Input
                value={formData.recentAbroadDetails}
                onChange={(event) => setFormData({ ...formData, recentAbroadDetails: event.target.value })}
                placeholder="Land / Region, falls bekannt"
                className="bg-white border-none text-xs h-9"
              />
            )}
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
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        substanceInfluence: option,
                        drugDetails: option === "Drogen" ? formData.drugDetails : "",
                      })
                    }
                    className={`p-2 rounded-[10px] text-left transition-all flex items-center gap-2 ${
                      isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                    }`}
                  >
                    <span className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-sm flex-1">
                      {option}
                    </span>
                    <SelectionMark selected={isSelected} />
                  </button>
                );
              })}
            </div>

            {formData.substanceInfluence === "Drogen" && (
              <Input
                value={formData.drugDetails}
                onChange={(event) => setFormData({ ...formData, drugDetails: event.target.value })}
                placeholder="Welche Drogen? z.B. Cannabis, Kokain"
                className="mt-2 bg-white border-none text-xs h-9"
              />
            )}
          </MedicalAccordionPanel>

          <MedicalAccordionPanel
            title="Allergien / Unverträglichkeiten"
            icon={CircleAlert}
            isOpen={expandedMedicalSections.allergies}
            onToggle={() => toggleMedicalSection("allergies")}
            summary={formData.allergies ? "Angaben hinterlegt" : "Optional ergänzen"}
          >
            <Label htmlFor="allergies" className="sr-only">
              Allergien / Unverträglichkeiten
            </Label>
            <textarea
              id="allergies"
              value={formData.allergies}
              onChange={(event) => setFormData({ ...formData, allergies: event.target.value })}
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
            <Label htmlFor="medications" className="sr-only">
              Aktuelle Medikamente
            </Label>
            <textarea
              id="medications"
              value={formData.medications}
              onChange={(event) => setFormData({ ...formData, medications: event.target.value })}
              placeholder="z.B. Blutdruckmittel, Schmerzmittel, Pille"
              className="w-full min-h-[82px] resize-none rounded-[10px] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
            />
          </MedicalAccordionPanel>
        </div>
      </div>

      <div className="mt-5 mb-5 flex justify-between gap-3">
        <Button variant="secondary" onClick={() => navigate("/patient-data")}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            Zurück
          </p>
        </Button>

        <Button onClick={handleContinue}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            Weiter
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
