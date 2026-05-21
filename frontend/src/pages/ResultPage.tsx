import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import Button from "../components/Button";
import { createSpecialtyConfig, isCareLevel, isMedicalSpecialty, TRIAGE_CONFIGS } from "../features/triage/triage";
import { useAssessment } from "../lib/AssessmentContext";
import type { CareLevel } from "../../../shared/result.types";
import { DURATIONS, getMeasurementConfig } from "../features/symptoms/symptoms.constants";
import type { Symptom } from "../types/assessment";

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, symptomDetails, assessmentResult, resetAssessment } = useAssessment();

  const isEmergency = searchParams.get("emergency") === "true";
  const fallbackCareLevel: CareLevel = isEmergency ? "emergency" : "selfcare";
  const careLevel = assessmentResult?.careLevel ?? fallbackCareLevel;
  const specialtyParam = searchParams.get("specialty");
  const backendRecommendedSpecialty = assessmentResult?.recommendedSpecialty ?? null;
  const recommendedSpecialty = isMedicalSpecialty(backendRecommendedSpecialty)
    ? backendRecommendedSpecialty
    : isMedicalSpecialty(specialtyParam)
      ? specialtyParam
      : null;

  const config =
    careLevel === "specialist" && recommendedSpecialty
      ? createSpecialtyConfig(recommendedSpecialty)
      : TRIAGE_CONFIGS[careLevel];

  const callAction =
    careLevel === "emergency"
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
        : null;

  const explanationReasons =
    assessmentResult?.reasons?.length
      ? assessmentResult.reasons
      : [
          "Ihre Angaben wurden ausgewertet.",
          "Bei Verschlechterung oder Unsicherheit sollten Sie medizinische Hilfe suchen.",
        ];

  const plainLanguageSummary =
    assessmentResult?.reviewSummary?.plainLanguage?.trim() ||
    assessmentResult?.summary?.trim() ||
    "Die Angaben wurden strukturiert ausgewertet.";

  const professionalSummary = assessmentResult?.reviewSummary?.professionalSummary?.trim() || null;

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  const getDurationLabel = (durationId: string) => {
    return DURATIONS.find((d) => d.id === durationId)?.label || durationId;
  };

  const getMeasurementSummary = (symptom: Symptom) => {
    const config = getMeasurementConfig(symptom.region, symptom.side);
    const value = symptom.painLevel ?? 0;

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

  const handlePdfDownload = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
      const assessmentCareLevel = assessmentResult?.careLevel ?? null;
      const assessmentRecommendedSpecialty = assessmentResult?.recommendedSpecialty ?? null;
      const safeCareLevel = isCareLevel(assessmentCareLevel)
        ? assessmentCareLevel
        : careLevel;

      const safeRecommendedSpecialty = isMedicalSpecialty(assessmentRecommendedSpecialty)
        ? assessmentRecommendedSpecialty
        : recommendedSpecialty ?? undefined;

      const pdfPayload = {
        reviewSummary: {
          plainLanguage: plainLanguageSummary,
          professionalSummary: professionalSummary ?? buildProfessionalSummaryFallback(),
        },
        triage: {
          careLevel: safeCareLevel,
          ...(safeCareLevel === "specialist" && safeRecommendedSpecialty
            ? { recommendedSpecialty: safeRecommendedSpecialty }
            : {}),
          reasons: explanationReasons.slice(0, 5),
        },
        ...(patientData ? { patientData } : {}),
        ...(symptomDetails.length > 0
          ? {
              symptoms: symptomDetails.slice(0, 3).map((symptom) => ({
                region: symptom.region,
                ...(symptom.side ? { side: symptom.side } : {}),
                ...(symptom.painLevel !== undefined ? { painLevel: symptom.painLevel } : {}),
                ...(symptom.duration ? { duration: symptom.duration } : {}),
              })),
            }
          : {}),
      };

      const response = await fetch(`${apiBaseUrl}/api/v1/pdf/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      link.download = "triage-review-summary.pdf";
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
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-3"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Ihre Einschätzung
        </p>
        <p
          className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm md:text-base leading-relaxed"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {plainLanguageSummary}
        </p>
        {assessmentResult?.aiUnavailable && (
          <p
            className="mt-3 font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
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
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-3"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Begründung
        </p>
        <ul className="space-y-1.5">
          {explanationReasons.map((reason) => (
            <li
              key={reason}
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              • {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Medizinische Zusammenfassung
          </p>
          <button
            onClick={handlePdfDownload}
            aria-label="download-summary"
            className="bg-[#486284] text-app-text-on-primary rounded-[10px] px-4 py-2 hover:bg-[#3a4d68] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              PDF
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {patientData && (
            <div>
              <p
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-2"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Stammdaten
              </p>
              <div className="bg-[#eff2f6] rounded-[10px] p-3 space-y-1">
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                  <strong>Geburtsdatum:</strong> {patientData.birthMonth}/{patientData.birthYear}
                </p>
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                  <strong>Größe/Gewicht:</strong> {patientData.height} cm / {patientData.weight} kg
                </p>
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                  <strong>Geschlecht:</strong> {patientData.gender}
                </p>
                {patientData.isPregnant && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Schwanger:</strong> Ja
                  </p>
                )}
                {patientData.isBreastfeeding && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Stillend:</strong> Ja
                  </p>
                )}
                {patientData.allergies && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Allergien:</strong> {patientData.allergies}
                  </p>
                )}
                {patientData.medications && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Medikamente:</strong> {patientData.medications}
                  </p>
                )}
                {patientData.substanceInfluence && patientData.substanceInfluence !== "Nein" && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Einfluss:</strong> {patientData.substanceInfluence}
                  </p>
                )}
                {patientData.recentAbroad && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Ausland letzte 3 Monate:</strong> Ja
                    {patientData.recentAbroadDetails && ` (${patientData.recentAbroadDetails})`}
                  </p>
                )}
                {patientData.conditions.length > 0 && (
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs">
                    <strong>Vorerkrankungen:</strong> {patientData.conditions.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {symptomDetails.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p
                  className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Beschwerden
                </p>
              </div>
              <div className="bg-[#eff2f6] rounded-[10px] p-3">
                <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
                  Patient klagt über{" "}
                  {symptomDetails.map((symptom, index) => (
                    <span key={`${symptom.region}-${symptom.side ?? "none"}-${index}`}>
                      <strong>
                        {symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}
                      </strong>{" "}
                      ({getMeasurementSummary(symptom)}
                      {symptom.duration && `, ${getDurationLabel(symptom.duration)}`})
                      {index < symptomDetails.length - 1 &&
                        (index === symptomDetails.length - 2 ? " und " : ", ")}
                    </span>
                  ))}
                  .
                </p>
              </div>
            </div>
          )}

          {professionalSummary && (
            <div>
              <p
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-2"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Klinische Zusammenfassung
              </p>
              <div className="bg-[#eff2f6] rounded-[10px] p-3">
                <p className="whitespace-pre-line font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-relaxed">
                  {professionalSummary}
                </p>
              </div>
            </div>
          )}

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
      </div>

      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-[16px] p-5 md:p-6 mt-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-app-text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-warning-strong text-base mb-2"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Wichtiger Hinweis
            </p>
            <p
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-warning-strong text-sm leading-relaxed"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Diese Einschätzung ist <strong>keine medizinische Diagnose</strong> und ersetzt nicht den Besuch bei einem Arzt.
              KI-Systeme können Fehler machen. Bei Unsicherheit oder Verschlechterung Ihres Zustands suchen Sie bitte
              umgehend medizinische Hilfe.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-6">
        <Button onClick={handleReset}>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Neue Bewertung starten
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
