import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Edit3, PhoneCall } from "lucide-react";
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
import type { Symptom } from "../types/assessment";

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
  const patientData = sections.patientData.trim() || "Keine Stammdaten vorhanden.";
  const complaints = sections.complaints.trim() || "Keine Beschwerden vorhanden.";

  return `Patientendaten:\n${patientData}\n\nBeschwerden:\n${complaints}`;
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, symptomDetails, assessmentResult, setAssessmentResult, resetAssessment } = useAssessment();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editableProfessionalSummary, setEditableProfessionalSummary] = useState("");
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
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
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
      "Patientendaten:",
      patientData
        ? [
            `Geburtsdatum: ${patientData.birthMonth}/${patientData.birthYear}`,
            `Größe/Gewicht: ${patientData.height} cm / ${patientData.weight} kg`,
            `Geschlecht: ${patientData.gender}`,
            patientData.isPregnant ? "Schwanger: Ja" : null,
            patientData.isBreastfeeding ? "Stillend: Ja" : null,
            patientData.allergies ? `Allergien: ${patientData.allergies}` : null,
            patientData.medications ? `Medikamente: ${patientData.medications}` : null,
            patientData.conditions.length > 0
              ? `Vorerkrankungen: ${patientData.conditions.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "Keine Stammdaten vorhanden.",
      "",
      "Beschwerden:",
      symptomDetails.length > 0
        ? symptomDetails
            .map((symptom) => {
              const label = symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;

              return `${label}, ${getMeasurementSummary(symptom)}${
                symptom.duration ? `, ${getDurationLabel(symptom.duration)}` : ""
              }`;
            })
            .join("\n")
        : "Keine Beschwerden vorhanden.",
    ].join("\n");
  };

  const professionalSummary =
    assessmentResult?.reviewSummary?.professionalSummary?.trim() || buildProfessionalSummaryFallback();

  useEffect(() => {
    setEditableProfessionalSummary(professionalSummary);
    setProfessionalSummaryDraft(parseMedicalSummarySections(professionalSummary));
  }, [professionalSummary]);

  const displayedProfessionalSummary = editableProfessionalSummary.trim()
    ? editableProfessionalSummary
    : professionalSummary;

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  const handleStartSummaryEdit = () => {
    setProfessionalSummaryDraft(parseMedicalSummarySections(displayedProfessionalSummary));
    setIsEditingSummary(true);
  };

  const handleCancelSummaryEdit = () => {
    setProfessionalSummaryDraft(parseMedicalSummarySections(displayedProfessionalSummary));
    setIsEditingSummary(false);
  };

  const handleSaveSummaryEdit = () => {
    const nextProfessionalSummary = formatMedicalSummarySections(professionalSummaryDraft);

    setEditableProfessionalSummary(nextProfessionalSummary);

    if (assessmentResult) {
      setAssessmentResult({
        ...assessmentResult,
        reviewSummary: {
          ...assessmentResult.reviewSummary,
          professionalSummary: nextProfessionalSummary,
        },
      });
    }

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
          professionalSummary: editableProfessionalSummary.trim() || professionalSummary,
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
      <ResultCard config={config} />

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
      </div>

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

      <div className="bg-[#eff2f6] rounded-[16px] p-5 md:p-6 mb-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-3">
          Begründung
        </p>
        <ul className="space-y-1.5">
          {explanationReasons.map((reason) => (
            <li key={reason} className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed">
              • {reason}
            </li>
          ))}
        </ul>
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
            <p className="text-xs text-app-text-subtle mb-1">Beschwerden</p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
              {symptomDetails.length > 0
                ? symptomDetails
                    .map((symptom) => {
                      const label = symptom.side
                        ? `${symptom.region} (${symptom.side})`
                        : symptom.region;

                      return `${label}: ${getMeasurementSummary(symptom)}${
                        symptom.duration ? `, ${getDurationLabel(symptom.duration)}` : ""
                      }`;
                    })
                    .join("; ")
                : "Keine Beschwerden angegeben."}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#d8e0ea] mb-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-base">
              Medical Summary
            </p>
            {isEditingSummary && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelSummaryEdit}
                  className="rounded-[10px] border border-[#d8e0ea] px-3 py-1.5 text-sm font-bold text-app-text-body transition-all hover:bg-[#eff2f6]"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveSummaryEdit}
                  className="rounded-[10px] bg-[#486284] px-3 py-1.5 text-sm font-bold text-app-text-on-primary transition-all hover:bg-[#3a4d68]"
                >
                  Speichern
                </button>
              </div>
            )}
          </div>

          {isEditingSummary ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-['DM_Sans:Bold',sans-serif] text-sm font-bold text-app-text-body">
                  Patientendaten:
                </p>
                <textarea
                  value={professionalSummaryDraft.patientData}
                  onChange={(event) =>
                    setProfessionalSummaryDraft((currentDraft) => ({
                      ...currentDraft,
                      patientData: event.target.value,
                    }))
                  }
                  aria-label="Patientendaten bearbeiten"
                  className="min-h-[96px] w-full resize-y rounded-[10px] border border-[#d8e0ea] bg-white p-3 font-['DM_Sans:Medium',sans-serif] text-sm leading-relaxed text-app-text-body outline-none transition-all focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20"
                />
              </div>

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
