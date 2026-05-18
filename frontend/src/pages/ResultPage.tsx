import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import Button from "../components/Button";
import { createSpecialtyConfig, isMedicalSpecialty, TRIAGE_CONFIGS } from "../features/triage/triage";
import { useAssessment } from "../lib/AssessmentContext";
import type { CareLevel } from "../../../shared/result.types";
import { DURATIONS, getMeasurementConfig } from "../features/symptoms/symptoms.constants";
import type { TriageSymptom } from "../../../shared/symptom.types";

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, symptomDetails, resetAssessment } = useAssessment();

  // Check if this is an emergency from landing page
  const isEmergency = searchParams.get("emergency") === "true";

  const isMultipleDays = (duration: string) => ["days", "week", "weeks"].includes(duration);

  const getSymptomCareLevel = (symptom: TriageSymptom): CareLevel => {
    const config = getMeasurementConfig(symptom.region, symptom.side);
    const painLevel = symptom.painLevel ?? config.defaultValue;

    if (config.type === "temperature") {
      if (painLevel >= 40 && symptom.duration && isMultipleDays(symptom.duration)) return "emergency";
      if (painLevel >= 39) return "doctor";
      return "selfcare";
    }

    if (painLevel >= 8) return "emergency";
    if (painLevel >= 5) return "doctor";
    return "selfcare";
  };

  const getHighestCareLevel = (levels: CareLevel[]): CareLevel => {
    if (levels.includes("emergency")) return "emergency";
    if (levels.includes("doctor")) return "doctor";
    return "selfcare";
  };

  const calculateCareLevel = (): CareLevel => {
    if (isEmergency) return "emergency";
    if (symptomDetails.length === 0) return "selfcare";

    return getHighestCareLevel(symptomDetails.map(getSymptomCareLevel));
  };

  const careLevel = calculateCareLevel();
  const specialtyParam = searchParams.get("specialty");
  const recommendedSpecialty = isMedicalSpecialty(specialtyParam) ? specialtyParam : null;
  const config = recommendedSpecialty ? createSpecialtyConfig(recommendedSpecialty) : TRIAGE_CONFIGS[careLevel];
  const callAction =
    careLevel === "emergency"
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
        : null;

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  const getDurationLabel = (durationId: string) => {
    return DURATIONS.find(d => d.id === durationId)?.label || durationId;
  };

  const getMeasurementSummary = (symptom: TriageSymptom) => {
    const config = getMeasurementConfig(symptom.region, symptom.side);
    const painLevel = symptom.painLevel ?? config.defaultValue;

    if (config.type === "temperature") {
      return `${config.title} ${painLevel.toFixed(1)} ${config.unit}`;
    }

    return `${config.title} ${painLevel}/10`;
  };

  return (
    <PageShell
      title="Ihre Auswertung"
      subtitle="Basierend auf Ihren Angaben haben wir folgende Empfehlung für Sie."
    >
      <ResultCard config={config} />

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

      {/* Begründung */}
      <div className="bg-[#eff2f6] rounded-[16px] p-5 md:p-6 mb-4">
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg mb-3"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Begründung
        </p>
        <ul className="space-y-1.5">
          <li
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            • Ihre Symptome deuten auf eine behandlungsbedürftige Erkrankung hin
          </li>
          <li
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-relaxed"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            • Die Dauer und Intensität Ihrer Beschwerden sollten ärztlich abgeklärt werden
          </li>
        </ul>
      </div>

      {/* Medical Summary */}
      <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Medizinische Zusammenfassung
          </p>
          <button
            onClick={() => alert('PDF-Download würde hier starten')}
            aria-label="download-summary"
            className="bg-[#486284] text-app-text-on-primary rounded-[10px] px-4 py-2 hover:bg-[#3a4d68] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
          {/* Stammdaten */}
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
                    <strong>Ausland letzte 3 Monate:</strong> Ja{patientData.recentAbroadDetails && ` (${patientData.recentAbroadDetails})`}
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

          {/* Symptome
          TODO: AI will do this as well
          */}

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
                      </strong>
                      {" "}({getMeasurementSummary(symptom)}
                      {symptom.duration && `, ${getDurationLabel(symptom.duration)}`})
                      {index < symptomDetails.length - 1 && (index === symptomDetails.length - 2 ? " und " : ", ")}
                    </span>
                  ))}.
                </p>
              </div>
            </div>
          )}

          {/* Zeitstempel */}
          <div className="pt-3 border-t border-gray-200">
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-subtle text-xs">
              Erstellt am: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-[16px] p-5 md:p-6 mt-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-app-text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
