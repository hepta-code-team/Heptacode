import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall } from "lucide-react";
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

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, symptomDetails, assessmentResult, resetAssessment } = useAssessment();

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
    const config = getMeasurementConfig(symptom.region, symptom.side);
    const value = symptom.measurementValue ?? 0;

    if (config.type === "temperature") {
      return `${config.title} ${value.toFixed(1)} ${config.unit}`;
    }

    return `${config.title} ${value}/10`;
  };

  const buildProfessionalSummaryFallback = () => {
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

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  const handlePdfDownload = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
      const safeCareLevel = isValidCareLevel(assessmentResult?.careLevel)
        ? assessmentResult.careLevel
        : careLevel;
      const safeRecommendedSpecialty = isValidMedicalSpecialty(assessmentResult?.recommendedSpecialty)
        ? assessmentResult.recommendedSpecialty
        : recommendedSpecialty;

      const pdfPayload = {
        reviewSummary: {
          plainLanguage: plainLanguageSummary,
          professionalSummary:
            assessmentResult?.reviewSummary?.professionalSummary?.trim() || buildProfessionalSummaryFallback(),
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
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg">
            Ihre Angaben
          </p>
          <button
            type="button"
            onClick={handlePdfDownload}
            aria-label="download-summary"
            className="bg-[#486284] text-app-text-on-primary rounded-[10px] px-4 py-2 hover:bg-[#3a4d68] transition-all"
          >
            PDF
          </button>
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
