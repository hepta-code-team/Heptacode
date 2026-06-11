import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronDown, Edit3, PhoneCall } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import Button from "../components/Button";
import {
  createSpecialtyConfig,
  isMedicalSpecialty,
  TRIAGE_CONFIGS,
} from "../features/results/result.config";
import { useAssessment } from "../lib/AssessmentContext";
import type { CareLevel, MedicalSpecialty } from "../../../shared/result.types";
import { CARE_LEVELS, MEDICAL_SPECIALTIES } from "../../../shared/result.types";
import { DURATIONS, getMeasurementConfig } from "../features/symptoms/symptoms.constants";
import type { PatientData, Symptom } from "../types/assessment";

const CARE_LEVEL_LABELS: Record<CareLevel, string> = {
  emergency: "Notfall - sofort medizinische Hilfe suchen",
  doctor: "Ärztliche Abklärung empfohlen",
  specialist: "Fachärztliche Abklärung empfohlen",
  selfcare: "Selbstbehandlung / Beobachtung",
};

const MEDICAL_SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  home_care: "Häusliche Versorgung",
  emergency_medicine: "Notfallmedizin",
  general_practice: "Allgemeinmedizin",
  internal_medicine: "Innere Medizin",
  cardiology: "Kardiologie",
  neurology: "Neurologie",
  orthopedics: "Orthopädie",
  gastroenterology: "Gastroenterologie",
  pulmonology: "Pneumologie",
  dermatology: "Dermatologie",
  urology: "Urologie",
  gynecology: "Gynäkologie",
  psychiatry: "Psychiatrie",
  pediatrics: "Kinderheilkunde",
  dentistry: "Zahnmedizin",
  ophthalmology: "Augenheilkunde",
  otolaryngology: "HNO",
};

const SUBSTANCE_OPTIONS = [
  "Alkohol",
  "Cannabis",
  "Kokain",
  "Amphetamine",
  "Opioide",
  "Beruhigungsmittel",
  "Andere",
];

const TRAVEL_COUNTRIES = [
  "Deutschland",
  "Frankreich",
  "Italien",
  "Spanien",
  "Österreich",
  "Schweiz",
  "Türkei",
  "Griechenland",
  "Kroatien",
  "Polen",
  "Niederlande",
  "Vereinigtes Königreich",
  "USA",
  "Kanada",
  "Mexiko",
  "Brasilien",
  "Ägypten",
  "Marokko",
  "Tunesien",
  "Südafrika",
  "Indien",
  "Thailand",
  "Vietnam",
  "China",
  "Japan",
  "Australien",
];

function isValidCareLevel(value: string | undefined): value is CareLevel {
  return value !== undefined && CARE_LEVELS.includes(value as CareLevel);
}

function isValidMedicalSpecialty(value: string | undefined | null): value is MedicalSpecialty {
  return value !== undefined && value !== null && MEDICAL_SPECIALTIES.includes(value as MedicalSpecialty);
}

function fallbackSpecialtyForCareLevel(careLevel: CareLevel): MedicalSpecialty {
  if (careLevel === "emergency") {
    return "emergency_medicine";
  }

  if (careLevel === "selfcare") {
    return "home_care";
  }

  return "general_practice";
}

function formatOptionalValue(value: string | undefined) {
  return value?.trim() || "Nicht angegeben";
}

function formatGender(value: string) {
  switch (value.toLowerCase()) {
    case "female":
    case "weiblich":
      return "Weiblich";
    case "male":
    case "männlich":
    case "maennlich":
      return "Männlich";
    case "diverse":
    case "divers":
      return "Divers";
    default:
      return formatOptionalValue(value);
  }
}

interface MedicalSummarySections {
  patientData: string;
  complaints: string;
}

const EMPTY_MEDICAL_SUMMARY_SECTIONS: MedicalSummarySections = {
  patientData: "",
  complaints: "",
};

function trimSectionLines(lines: string[]) {
  return lines.join("\n").trim();
}

/**
 * Detects placeholder patient-data text that should not be edited as real data.
 *
 * Backend fallbacks use this sentence when no patient profile exists, but the
 * result page should treat it as absence of content rather than user input.
 */
function isEmptyPatientDataPlaceholder(line: string) {
  return line.trim().toLowerCase() === "keine stammdaten vorhanden.";
}

/**
 * Splits a professional summary into editable patient and complaint sections.
 *
 * The parser accepts both current PDF headings and older fallback headings so
 * stored AI summaries, local fallbacks, and user edits stay compatible.
 */
function parseMedicalSummarySections(summary: string): MedicalSummarySections {
  const sections: MedicalSummarySections = { ...EMPTY_MEDICAL_SUMMARY_SECTIONS };
  const patientDataLines: string[] = [];
  const complaintLines: string[] = [];
  let activeSection: keyof MedicalSummarySections | null = null;

  summary.split("\n").forEach((line) => {
    const normalizedLine = line.trim().toLowerCase();

    if (normalizedLine === "patientendaten:") {
      activeSection = "patientData";
      return;
    }

    if (normalizedLine === "beschwerden:") {
      activeSection = "complaints";
      return;
    }

    if (normalizedLine === "stammdaten:") {
      if (patientDataLines.length === 1 && isEmptyPatientDataPlaceholder(patientDataLines[0])) {
        patientDataLines.length = 0;
      }

      activeSection = "patientData";
      return;
    }

    if (
      normalizedLine === "ausgewählte symptome:" ||
      normalizedLine === "ausgewaehlte symptome:" ||
      normalizedLine === "detailangaben zu aktiven symptomen:"
    ) {
      activeSection = "complaints";
      complaintLines.push(line);
      return;
    }

    if (activeSection === "patientData") {
      patientDataLines.push(line);
      return;
    }

    if (activeSection === "complaints") {
      complaintLines.push(line);
    }
  });

  sections.patientData = trimSectionLines(patientDataLines);
  sections.complaints = trimSectionLines(complaintLines);

  if (!sections.patientData && !sections.complaints && summary.trim()) {
    sections.complaints = summary.trim();
  }

  return sections;
}

/**
 * Reassembles editable summary fields into the PDF-compatible section format.
 *
 * The backend PDF export recognizes these headings, so the edited summary can
 * round-trip from the result page into a clean medical overview.
 */
function formatMedicalSummarySections(sections: MedicalSummarySections) {
  const complaints = sections.complaints.trim() || "Keine Beschwerden vorhanden.";

  return `Beschwerden:\n${complaints}`;
}

function splitTravelDetails(details: string) {
  const [country = "", startDate = "", endDate = ""] = details.split("|").map((part) => part.trim());

  if (startDate || endDate) {
    return { country, startDate, endDate };
  }

  return { country: details.trim(), startDate: "", endDate: "" };
}

function formatTravelDetails(country: string, startDate: string, endDate: string) {
  const cleanCountry = country.trim();
  const cleanStartDate = startDate.trim();
  const cleanEndDate = endDate.trim();

  if (cleanCountry || cleanStartDate || cleanEndDate) {
    return [cleanCountry, cleanStartDate, cleanEndDate].join(" | ");
  }

  return "";
}

function formatTravelDisplay(value: string) {
  const { country, startDate, endDate } = splitTravelDetails(value);

  if (country && startDate && endDate) {
    return `${country}, ${startDate} bis ${endDate}`;
  }

  if (country && startDate) {
    return `${country}, ab ${startDate}`;
  }

  if (country && endDate) {
    return `${country}, bis ${endDate}`;
  }

  return country || startDate || endDate || value;
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, setPatientData, symptomDetails, assessmentResult, setAssessmentResult, resetAssessment } = useAssessment();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [patientDataDraft, setPatientDataDraft] = useState<PatientData | null>(null);
  const [conditionListDraft, setConditionListDraft] = useState("");
  const [travelCountryDraft, setTravelCountryDraft] = useState("");
  const [travelStartDateDraft, setTravelStartDateDraft] = useState("");
  const [travelEndDateDraft, setTravelEndDateDraft] = useState("");
  const [editableProfessionalSummary, setEditableProfessionalSummary] = useState("");
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [professionalSummaryDraft, setProfessionalSummaryDraft] = useState<MedicalSummarySections>(
    EMPTY_MEDICAL_SUMMARY_SECTIONS,
  );

  const isEmergency = searchParams.get("emergency") === "true";
  const fallbackCareLevel: CareLevel = isEmergency ? "emergency" : "selfcare";
  const careLevel = assessmentResult?.careLevel ?? fallbackCareLevel;
  const specialtyParam = searchParams.get("specialty");
  const recommendedSpecialty = isValidMedicalSpecialty(assessmentResult?.recommendedSpecialty)
    ? assessmentResult.recommendedSpecialty
    : isMedicalSpecialty(specialtyParam)
      ? specialtyParam
      : fallbackSpecialtyForCareLevel(careLevel);

  const config =
    careLevel === "specialist" && isMedicalSpecialty(recommendedSpecialty)
      ? createSpecialtyConfig(recommendedSpecialty)
      : TRIAGE_CONFIGS[careLevel === "specialist" ? "doctor" : careLevel];

  const callAction =
      careLevel === "emergency"
          ? {href: "tel:112", label: "112 anrufen", description: "Notruf"}
          : careLevel === "doctor"
              ? {href: "tel:116117", label: "Ärztlicher Bereitschaftsdienst (116 117)", description: "Ärztlicher Bereitschaftsdienst"}
              : recommendedSpecialty === "psychiatry"
                  ? {href: "tel:0800 1110111", label: "Telefonseelsorge (0800 1110111)", description: "Telefonseelsorge"}
                  : null;

  const explanationReasons = assessmentResult?.reasons?.length
    ? assessmentResult.reasons
    : [
        "Ihre Angaben wurden ausgewertet.",
        "Bei Verschlechterung oder Unsicherheit sollten Sie medizinische Hilfe suchen.",
      ];

  const plainLanguageSummary =
    assessmentResult?.reviewSummary?.plainLanguage?.trim() ||
    assessmentResult?.summary?.trim() ||
    "Die Angaben wurden strukturiert ausgewertet.";

  const getDurationLabel = (durationId: string) => {
    return DURATIONS.find((duration) => duration.id === durationId)?.label || durationId;
  };

  const getMeasurementSummary = (symptom: Symptom) => {
    const config = getMeasurementConfig(symptom.region);
    const value = symptom.measurementValue ?? 0;

    if (config.type === "temperature") {
      return `${config.title} ${value.toFixed(1)} ${config.unit}`;
    }

    return `${config.title} ${value}/10`;
  };

  /**
   * Creates a professional summary when the backend did not provide one.
   *
   * The generated text intentionally follows the same headings as AI summaries
   * so editing and PDF export can use one parser for both paths.
   */
  const buildProfessionalSummaryFallback = () => {
    // Build the same section format that the PDF export expects when the backend summary is missing.
    return [
      "Beschwerden:",
      symptomDetails.length > 0
        ? symptomDetails
            .map((symptom) => {
              const label = symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
              const details = symptom.details ? `, Details: ${symptom.details}` : "";

              return `${label}${details}, ${getMeasurementSummary(symptom)}${
                symptom.duration ? `, ${getDurationLabel(symptom.duration)}` : ""
              }`;
            })
            .join("\n\n")
        : "Keine Beschwerden vorhanden.",
    ].join("\n");
  };

  const professionalSummary =
    assessmentResult?.reviewSummary?.professionalSummary?.trim() || buildProfessionalSummaryFallback();

  const formatConditionDetail = (detail: PatientData["conditionDetails"][string]) => {
    const parts = [
      detail.detail.trim() ? detail.detail.trim() : null,
      detail.duration.trim() ? `Dauer: ${detail.duration.trim()}` : null,
    ].filter((part): part is string => part !== null);

    return parts.join(", ");
  };

  const conditionDetails = patientData
    ? Object.entries(patientData.conditionDetails)
        .map(([condition, detail]) => {
          const formattedDetail = formatConditionDetail(detail);
          return formattedDetail ? `${condition}: ${formattedDetail}` : null;
        })
        .filter((detail): detail is string => detail !== null)
    : [];

  const patientDataRows = patientData
    ? [
        { label: "Geburtsdatum", value: `${formatOptionalValue(patientData.birthMonth)}/${formatOptionalValue(patientData.birthYear)}` },
        { label: "Größe / Gewicht", value: `${formatOptionalValue(patientData.height)} cm / ${formatOptionalValue(patientData.weight)} kg` },
        { label: "Geschlecht", value: formatGender(patientData.gender) },
        { label: "Schwangerschaft", value: patientData.isPregnant ? "Ja" : "Nein" },
        { label: "Stillzeit", value: patientData.isBreastfeeding ? "Ja" : "Nein" },
        { label: "Allergien", value: formatOptionalValue(patientData.allergies) },
        { label: "Medikamente", value: formatOptionalValue(patientData.medications) },
        { label: "Substanzbeeinflussung", value: formatOptionalValue(patientData.substanceInfluence || "Nein") },
        {
          label: "Auslandsreise",
          value: patientData.recentAbroad
            ? formatOptionalValue(formatTravelDisplay(patientData.recentAbroadDetails) || "Ja")
            : "Nein",
        },
        {
          label: "Vorerkrankungen",
          value: patientData.conditions.length > 0 ? patientData.conditions.join(", ") : "Keine angegeben",
        },
        { label: "Raucher", value: patientData.isSmoker ? "Ja" : "Nein" },
        ...(patientData.isSmoker
          ? [
              { label: "Rauchdauer", value: formatOptionalValue(patientData.smokingSinceYears) },
              { label: "Zigaretten pro Tag", value: formatOptionalValue(patientData.cigarettesPerDay) },
            ]
          : []),
        ...(conditionDetails.length > 0
          ? [{ label: "Details zu Vorerkrankungen", value: conditionDetails.join("; ") }]
          : []),
      ]
    : [];

  useEffect(() => {
    setEditableProfessionalSummary(professionalSummary);
    setProfessionalSummaryDraft(parseMedicalSummarySections(professionalSummary));
  }, [professionalSummary]);

  const displayedProfessionalSummary = editableProfessionalSummary.trim()
    ? formatMedicalSummarySections(parseMedicalSummarySections(editableProfessionalSummary))
    : formatMedicalSummarySections(parseMedicalSummarySections(professionalSummary));

  const updatePatientDataDraft = <K extends keyof PatientData>(key: K, value: PatientData[K]) => {
    setPatientDataDraft((currentDraft) => currentDraft ? { ...currentDraft, [key]: value } : currentDraft);
  };

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  const handleStartSummaryEdit = () => {
    const summaryDraft = parseMedicalSummarySections(displayedProfessionalSummary);
    const travelDetails = splitTravelDetails(patientData?.recentAbroadDetails ?? "");

    setPatientDataDraft(patientData ? { ...patientData } : null);
    setConditionListDraft(patientData?.conditions.join(", ") ?? "");
    setTravelCountryDraft(travelDetails.country);
    setTravelStartDateDraft(travelDetails.startDate);
    setTravelEndDateDraft(travelDetails.endDate);
    setProfessionalSummaryDraft(summaryDraft);
    setIsEditingSummary(true);
  };

  const handleCancelSummaryEdit = () => {
    setProfessionalSummaryDraft(parseMedicalSummarySections(displayedProfessionalSummary));
    setPatientDataDraft(null);
    setConditionListDraft("");
    setTravelCountryDraft("");
    setTravelStartDateDraft("");
    setTravelEndDateDraft("");
    setIsEditingSummary(false);
  };

  const handleSaveSummaryEdit = () => {
    const nextPatientData = patientDataDraft
      ? {
          ...patientDataDraft,
          recentAbroadDetails: patientDataDraft.recentAbroad
            ? formatTravelDetails(travelCountryDraft, travelStartDateDraft, travelEndDateDraft)
            : "",
          conditions: conditionListDraft
            .split(",")
            .map((condition) => condition.trim())
            .filter((condition) => condition.length > 0),
        }
      : null;
    const nextProfessionalSummary = formatMedicalSummarySections({
      ...professionalSummaryDraft,
    });

    setEditableProfessionalSummary(nextProfessionalSummary);

    if (nextPatientData) {
      setPatientData(nextPatientData);
    }

    if (assessmentResult) {
      setAssessmentResult({
        ...assessmentResult,
        reviewSummary: {
          ...assessmentResult.reviewSummary,
          professionalSummary: nextProfessionalSummary,
        },
      });
    }

    setPatientDataDraft(null);
    setConditionListDraft("");
    setTravelCountryDraft("");
    setTravelStartDateDraft("");
    setTravelEndDateDraft("");
    setIsEditingSummary(false);
  };

  /**
   * Sends the current result state to the backend PDF endpoint and downloads it.
   *
   * The page can also render from URL fallbacks, so this builds a schema-safe
   * payload even when no persisted assessment result exists in context.
   */
  const handlePdfDownload = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
      const safeCareLevel = isValidCareLevel(assessmentResult?.careLevel)
        ? assessmentResult.careLevel
        : careLevel;
      const safeRecommendedSpecialty = isValidMedicalSpecialty(assessmentResult?.recommendedSpecialty)
        ? assessmentResult.recommendedSpecialty
        : recommendedSpecialty;

      // Keep the export payload conservative and schema-shaped even when the page is rendered from URL fallbacks.
      const pdfPayload = {
        reviewSummary: {
          plainLanguage: plainLanguageSummary,
          professionalSummary: displayedProfessionalSummary,
        },
        triage: {
          careLevel: safeCareLevel,
          recommendedSpecialty: safeRecommendedSpecialty,
          reasons: explanationReasons.slice(0, 5),
        },
        ...(patientData ? { patientData } : {}),
        ...(symptomDetails.length > 0
          ? {
              symptoms: symptomDetails.slice(0, 3).map((symptom) => ({
                region: symptom.region,
                ...(symptom.side ? { side: symptom.side } : {}),
                ...(symptom.details ? { details: symptom.details } : {}),
                measurementType: symptom.measurementType,
                measurementValue: symptom.measurementValue,
                ...(symptom.duration ? { duration: symptom.duration } : {}),
              })),
            }
          : {}),
      };

      const response = await fetch(`${apiBaseUrl}/api/v1/pdf/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF konnte nicht erstellt werden: ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "medizinische-ersteinschaetzung.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Das PDF konnte nicht heruntergeladen werden.");
    }
  };

  return (
    <PageShell
      title="Ihre Auswertung"
      subtitle="Basierend auf Ihren Angaben haben wir folgende Empfehlung für Sie."
    >
      <ResultCard config={config} careLevel={careLevel} recommendedSpecialty={recommendedSpecialty} />

      {callAction && (
          <a
              href={callAction.href}
              className="md:hidden mb-4 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[14px] px-5 py-3 text-app-text-on-primary shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: config.color }}
              aria-label={callAction.label}
          >
            <PhoneCall className="size-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            {callAction.label}
          </span>
            <span className="sr-only">{callAction.description}</span>
          </a>
      )}
      <div className="bg-white border border-[#d8e0ea] rounded-[16px] p-5 md:p-6 mb-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-3">
          Ihre Einschätzung
        </p>
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm md:text-base leading-relaxed">
          {plainLanguageSummary}
        </p>
        {assessmentResult?.aiUnavailable && (
          <p className="mt-3 font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
            Die automatische KI-Auswertung war nicht vollständig verfügbar. Die Empfehlung wurde
            deshalb mit einem vorsichtigen medizinischen Fallback erzeugt.
          </p>
        )}



        <button
          type="button"
          onClick={() => setIsExplanationOpen((isOpen) => !isOpen)}
          className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[#d8e0ea] px-4 py-2 text-app-text-primary transition-all hover:border-[#486284] hover:bg-[#eff2f6]"
          aria-expanded={isExplanationOpen}
        >
          <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm">
            {isExplanationOpen ? "KI-Begründung ausblenden" : "KI-Begründung anzeigen"}
          </span>
          <ChevronDown
            className={`size-4 flex-shrink-0 text-app-text-primary transition-transform ${
              isExplanationOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isExplanationOpen && (
          <div className="mt-4">
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-sm mb-2">
              KI-Begründung
            </p>
            <ul className="space-y-1.5">
              {explanationReasons.map((reason) => (
                <li
                  key={reason}
                  className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed"
                >
                  • {reason}
                </li>
              ))}
              {assessmentResult?.aiModel && (
                <li className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed">
                  • Die Einschätzung wurde mit dem KI-Modell{" "}
                  <strong>{assessmentResult.aiModel}</strong> durchgeführt.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>



      <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg">
            Ihre Angaben
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStartSummaryEdit}
              aria-label="medical-summary-bearbeiten"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#486284] px-4 py-2 text-sm font-bold text-[#486284] transition-all hover:bg-[#eff2f6]"
            >
              <Edit3 className="size-4" aria-hidden="true" />
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={handlePdfDownload}
              aria-label="download-summary"
              className="bg-[#486284] text-app-text-on-primary rounded-[10px] px-4 py-2 hover:bg-[#3a4d68] transition-all"
            >
              PDF
            </button>
          </div>
        </div>

        <div className="bg-[#eff2f6] rounded-[12px] p-4 mb-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-white rounded-[10px] p-3 border border-[#d8e0ea]">
              <p className="text-xs text-app-text-subtle mb-1">Empfehlung</p>
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm">
                {CARE_LEVEL_LABELS[careLevel]}
              </p>
            </div>
            <div className="bg-white rounded-[10px] p-3 border border-[#d8e0ea]">
              <p className="text-xs text-app-text-subtle mb-1">Fachrichtung</p>
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm">
                {MEDICAL_SPECIALTY_LABELS[recommendedSpecialty]}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[10px] p-3 border border-[#d8e0ea]">
            <p className="text-xs text-app-text-subtle mb-2">Patientendaten</p>
            {isEditingSummary && patientDataDraft ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Geburtsmonat</span>
                  <input
                    value={patientDataDraft.birthMonth}
                    onChange={(event) => updatePatientDataDraft("birthMonth", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Geburtsjahr</span>
                  <input
                    value={patientDataDraft.birthYear}
                    onChange={(event) => updatePatientDataDraft("birthYear", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Größe</span>
                  <input
                    value={patientDataDraft.height}
                    onChange={(event) => updatePatientDataDraft("height", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Gewicht</span>
                  <input
                    value={patientDataDraft.weight}
                    onChange={(event) => updatePatientDataDraft("weight", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Geschlecht</span>
                  <select
                    value={patientDataDraft.gender}
                    onChange={(event) => updatePatientDataDraft("gender", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  >
                    <option value="Weiblich">Weiblich</option>
                    <option value="Männlich">Männlich</option>
                    <option value="Divers">Divers</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-bold text-app-text-body">
                    <input
                      type="checkbox"
                      checked={patientDataDraft.isPregnant}
                      onChange={(event) => updatePatientDataDraft("isPregnant", event.target.checked)}
                    />
                    Schwanger
                  </label>
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-bold text-app-text-body">
                    <input
                      type="checkbox"
                      checked={patientDataDraft.isBreastfeeding}
                      onChange={(event) => updatePatientDataDraft("isBreastfeeding", event.target.checked)}
                    />
                    Stillzeit
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Allergien</span>
                  <input
                    value={patientDataDraft.allergies}
                    onChange={(event) => updatePatientDataDraft("allergies", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Medikamente</span>
                  <input
                    value={patientDataDraft.medications}
                    onChange={(event) => updatePatientDataDraft("medications", event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <div className="block">
                  <span className="text-[11px] font-medium text-app-text-subtle">Substanzbeeinflussung</span>
                  <select
                    value={patientDataDraft.substanceInfluence.trim().toLowerCase() === "nein" || !patientDataDraft.substanceInfluence.trim() ? "Nein" : "Ja"}
                    onChange={(event) => updatePatientDataDraft("substanceInfluence", event.target.value === "Ja" ? SUBSTANCE_OPTIONS[0] : "Nein")}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  >
                    <option value="Nein">Nein</option>
                    <option value="Ja">Ja</option>
                  </select>
                  {patientDataDraft.substanceInfluence.trim().toLowerCase() !== "nein" && patientDataDraft.substanceInfluence.trim() && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        value={SUBSTANCE_OPTIONS.includes(patientDataDraft.substanceInfluence) ? patientDataDraft.substanceInfluence : "Andere"}
                        onChange={(event) => updatePatientDataDraft("substanceInfluence", event.target.value)}
                        className="w-full rounded-[8px] border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                      >
                        {SUBSTANCE_OPTIONS.map((substance) => (
                          <option key={substance} value={substance}>{substance}</option>
                        ))}
                      </select>
                      <input
                        value={SUBSTANCE_OPTIONS.includes(patientDataDraft.substanceInfluence) ? "" : patientDataDraft.substanceInfluence}
                        onChange={(event) => updatePatientDataDraft("substanceInfluence", event.target.value)}
                        placeholder="Welche Substanz?"
                        className="w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                      />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 md:col-span-2 md:grid-cols-[auto_1fr_1fr]">
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-bold text-app-text-body">
                    <input
                      type="checkbox"
                      checked={patientDataDraft.recentAbroad}
                      onChange={(event) => {
                        updatePatientDataDraft("recentAbroad", event.target.checked);

                        if (!event.target.checked) {
                          setTravelCountryDraft("");
                          setTravelStartDateDraft("");
                          setTravelEndDateDraft("");
                        }
                      }}
                    />
                    Auslandsreise
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-app-text-subtle">Wo</span>
                    <input
                      list="travel-country-options"
                      value={travelCountryDraft}
                      onChange={(event) => setTravelCountryDraft(event.target.value)}
                      disabled={!patientDataDraft.recentAbroad}
                      className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                    <datalist id="travel-country-options">
                      {TRAVEL_COUNTRIES.map((country) => (
                        <option key={country} value={country} />
                      ))}
                    </datalist>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-app-text-subtle">Von</span>
                    <input
                      type="date"
                      value={travelStartDateDraft}
                      onChange={(event) => setTravelStartDateDraft(event.target.value)}
                      disabled={!patientDataDraft.recentAbroad}
                      className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                  </label>
                  <label className="block md:col-start-3">
                    <span className="text-[11px] font-medium text-app-text-subtle">Bis</span>
                    <input
                      type="date"
                      value={travelEndDateDraft}
                      min={travelStartDateDraft || undefined}
                      onChange={(event) => setTravelEndDateDraft(event.target.value)}
                      disabled={!patientDataDraft.recentAbroad}
                      className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                  </label>
                </div>
                <label className="block md:col-span-2">
                  <span className="text-[11px] font-medium text-app-text-subtle">Vorerkrankungen</span>
                  <input
                    value={conditionListDraft}
                    onChange={(event) => setConditionListDraft(event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                  />
                </label>
                <div className="grid gap-3 md:col-span-2 md:grid-cols-[auto_1fr_1fr]">
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-bold text-app-text-body">
                    <input
                      type="checkbox"
                      checked={patientDataDraft.isSmoker}
                      onChange={(event) => updatePatientDataDraft("isSmoker", event.target.checked)}
                    />
                    Raucher
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-app-text-subtle">Rauchdauer</span>
                    <input
                      value={patientDataDraft.smokingSinceYears}
                      onChange={(event) => updatePatientDataDraft("smokingSinceYears", event.target.value)}
                      className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-app-text-subtle">Zigaretten pro Tag</span>
                    <input
                      value={patientDataDraft.cigarettesPerDay}
                      onChange={(event) => updatePatientDataDraft("cigarettesPerDay", event.target.value)}
                      className="mt-1 w-full rounded-[8px] border border-[#d8e0ea] px-3 py-2 text-sm font-medium text-app-text-body outline-none focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                    />
                  </label>
                </div>
              </div>
            ) : patientDataRows.length > 0 ? (
              <dl className="grid gap-x-4 gap-y-2 md:grid-cols-2">
                {patientDataRows.map((row) => (
                  <div key={row.label} className="min-w-0">
                    <dt className="text-[11px] font-medium text-app-text-subtle">{row.label}</dt>
                    <dd className="break-words font-['DM_Sans:Bold',sans-serif] text-sm font-bold text-app-text-body">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
                Keine Patientendaten angegeben.
              </p>
            )}
          </div>

          <div className="bg-white rounded-[10px] p-3 border border-[#d8e0ea]">
            <p className="text-xs text-app-text-subtle mb-1">Beschwerden</p>
            <div className="space-y-2 font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
              {symptomDetails.length > 0 ? (
                symptomDetails.map((symptom) => {
                      const label = symptom.side
                        ? `${symptom.region} (${symptom.side})`
                        : symptom.region;

                      return (
                        <p key={`${label}-${symptom.measurementType}-${symptom.measurementValue}-${symptom.duration ?? ""}`}>
                          {label}: {getMeasurementSummary(symptom)}{
                        symptom.duration ? `, ${getDurationLabel(symptom.duration)}` : ""
                      }
                        </p>
                      );
                    })
              ) : (
                <p>Keine Beschwerden angegeben.</p>
              )}
            </div>
          </div>

          {isEditingSummary && (
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelSummaryEdit}
                className="rounded-[10px] border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-bold text-app-text-body transition-all hover:bg-[#eff2f6]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveSummaryEdit}
                className="rounded-[10px] bg-[#486284] px-4 py-2 text-sm font-bold text-app-text-on-primary transition-all hover:bg-[#3a4d68]"
              >
                Speichern
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#d8e0ea] mb-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-base">
              Medical Summary
            </p>
          </div>

          {isEditingSummary ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-['DM_Sans:Bold',sans-serif] text-sm font-bold text-app-text-body">
                  Beschwerden:
                </p>
                <textarea
                  value={professionalSummaryDraft.complaints}
                  onChange={(event) =>
                    setProfessionalSummaryDraft((currentDraft) => ({
                      ...currentDraft,
                      complaints: event.target.value,
                    }))
                  }
                  aria-label="Beschwerden bearbeiten"
                  className="min-h-[96px] w-full resize-y rounded-[10px] border border-[#d8e0ea] bg-white p-3 font-['DM_Sans:Medium',sans-serif] text-sm leading-relaxed text-app-text-body outline-none transition-all focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                />
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-line font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed">
              {displayedProfessionalSummary}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-gray-200">
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-subtle text-xs">
            Erstellt am:{" "}
            {new Date(assessmentResult?.createdAt ?? Date.now()).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-[16px] p-5 md:p-6 mt-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-warning-strong text-base mb-2">
          Wichtiger Hinweis
        </p>
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-warning-strong text-sm leading-relaxed">
          Diese Einschätzung ist <strong>keine medizinische Diagnose</strong> und ersetzt nicht den Besuch bei einem Arzt.
          KI-Systeme können Fehler machen. Bei Unsicherheit oder Verschlechterung Ihres Zustands suchen Sie bitte
          umgehend medizinische Hilfe.
          {assessmentResult?.aiModel && (
            <>
              {" "}
              Die Triage wurde mit dem KI-Modell <strong>{assessmentResult.aiModel}</strong> durchgeführt.
            </>
          )}
        </p>
      </div>

      <div className="mt-6 mb-6">
        <Button onClick={handleReset}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            Neue Bewertung starten
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
