import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import Button from "../components/Button";
import NearbyPracticeSearch from "../features/results/NearbyPracticeSearch";
import { TRIAGE_CONFIGS } from "../types/triage";
import { useAssessment } from "../lib/AssessmentContext";
import { getFrontendTriageRecommendation } from "../lib/specialtyRecommendation";
import type { CareLevel } from "../types/triage";
import { DURATIONS, getMeasurementConfig } from "../features/symptoms/symptoms.constants";
import type { Symptom } from "../types/assessment";

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, selectedSymptoms, symptomDetails, resetAssessment } = useAssessment();

  const isEmergency = searchParams.get("emergency") === "true";
  const hasCapturedSymptoms = selectedSymptoms.length > 0 || symptomDetails.length > 0;
  const shouldShowAssessmentData = !isEmergency;

  const handleReset = () => {
    resetAssessment();
    navigate("/");
  };

  if (!isEmergency && !hasCapturedSymptoms) {
    return (
      <PageShell
        title="Keine Beschwerden erfasst"
        subtitle="Für eine Einschätzung müssen zuerst Beschwerden ausgewählt werden."
      >
        <div className="rounded-[16px] bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-5 md:p-6 mb-4">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#92400E] text-lg mb-2">
            Es wurde noch keine Beschwerde angegeben.
          </p>
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#92400E] text-sm leading-relaxed">
            Bitte wählen Sie mindestens eine Beschwerde aus, damit eine vorläufige Einschätzung erstellt werden kann.
            Ohne Beschwerden wird keine Empfehlung zu Versorgung oder Fachrichtung angezeigt.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button onClick={() => navigate("/symptom-selection")}>
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
              Beschwerden erfassen
            </p>
          </Button>

          <Button variant="secondary" onClick={handleReset}>
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
              Neue Einschätzung starten
            </p>
          </Button>
        </div>
      </PageShell>
    );
  }

  const isMultipleDays = (duration: string) => ["days", "week", "weeks"].includes(duration);

  const getSymptomCareLevel = (symptom: Symptom): CareLevel => {
    const config = getMeasurementConfig(symptom.region, symptom.side);

    if (config.type === "temperature") {
      if (symptom.measurementValue >= 40 && isMultipleDays(symptom.duration)) return "emergency";
      if (symptom.measurementValue >= 39) return "doctor";
      return "selfcare";
    }

    if (symptom.measurementValue >= 8) return "emergency";
    if (symptom.measurementValue >= 5) return "doctor";
    return "selfcare";
  };

  const getHighestCareLevel = (levels: CareLevel[]): CareLevel => {
    if (levels.includes("emergency")) return "emergency";
    if (levels.includes("doctor")) return "doctor";
    if (levels.includes("specialist")) return "specialist";
    return "selfcare";
  };

  const calculateCareLevel = (): CareLevel => {
    if (isEmergency) return "emergency";
    if (symptomDetails.length === 0) return "selfcare";

    return getHighestCareLevel(symptomDetails.map(getSymptomCareLevel));
  };

  const specialtyRecommendation = isEmergency
    ? null
    : getFrontendTriageRecommendation({
        patientData,
        selectedSymptoms,
        symptomDetails,
      });

  const baselineCareLevel = calculateCareLevel();

  const recommendationCareLevel: CareLevel | null =
    specialtyRecommendation?.careLevel === "specialist"
      ? "doctor"
      : specialtyRecommendation?.careLevel ?? null;

  const careLevel: CareLevel = isEmergency
    ? "emergency"
    : getHighestCareLevel([baselineCareLevel, recommendationCareLevel].filter(Boolean) as CareLevel[]);

  const config =
    careLevel === "doctor"
      ? {
          ...TRIAGE_CONFIGS.doctor,
          title: "Ärztliche Versorgung empfohlen",
          description:
            "Ihre Beschwerden sollten ärztlich abgeklärt werden. Je nach Beschwerdebild kann eine fachärztliche Abklärung sinnvoll sein.",
        }
      : TRIAGE_CONFIGS[careLevel];

  const callAction =
    careLevel === "emergency"
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
        : null;

  const getDurationLabel = (durationId: string) => {
    return DURATIONS.find((duration) => duration.id === durationId)?.label || durationId;
  };

  const getMeasurementSummary = (symptom: Symptom) => {
    const config = getMeasurementConfig(symptom.region, symptom.side);

    if (config.type === "temperature") {
      return `${config.title} ${symptom.measurementValue.toFixed(1)} ${config.unit}`;
    }

    return `${config.title} ${symptom.measurementValue}/10`;
  };

  return (
    <PageShell
      title="Ihre Einschätzung"
      subtitle={
        isEmergency
          ? "Aufgrund eines Warnsymptoms wird eine sofortige medizinische Abklärung empfohlen."
          : "Basierend auf Ihren Angaben haben wir folgende Empfehlung für Sie vorbereitet."
      }
    >
      <ResultCard config={config} />

      {callAction && (
        <a
          href={callAction.href}
          className="md:hidden mb-4 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[14px] px-5 py-3 text-white shadow-sm transition-all hover:opacity-90"
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

      {!isEmergency && specialtyRecommendation?.recommendedSpecialties?.length ? (
        <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-3">
            Empfohlene Fachrichtung
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specialtyRecommendation.recommendedSpecialties.slice(0, 3).map((specialty) => (
              <div key={specialty.specialty} className="rounded-[14px] bg-[#eff2f6] p-4">
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                  {specialty.label}
                </p>
                <p className="mt-1 font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs leading-relaxed">
                  {specialty.reason}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs font-medium text-[#486284]">
            Vorläufige Frontend-Einschätzung. Die finale Empfehlung soll später vom Backend/KI-System kommen.
          </p>
        </div>
      ) : null}

      <NearbyPracticeSearch
        emergencyMode={isEmergency}
        specialties={specialtyRecommendation?.recommendedSpecialties ?? []}
      />

      <div className="bg-[#eff2f6] rounded-[16px] p-5 md:p-6 mb-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-3">
          Begründung
        </p>

        {isEmergency ? (
          <ul className="space-y-1.5">
            <li className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed">
              • Ein Warnsymptom wurde ausgewählt.
            </li>
            <li className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed">
              • Bitte suchen Sie sofort medizinische Hilfe oder wählen Sie bei akuter Gefahr den Notruf.
            </li>
          </ul>
        ) : (
          <ul className="space-y-1.5">
            {(specialtyRecommendation?.reasons?.length
              ? specialtyRecommendation.reasons
              : [
                  "Ihre Symptome sollten anhand von Dauer und Intensität eingeordnet werden.",
                  "Die Empfehlung ist eine vorläufige Einschätzung und ersetzt keine ärztliche Beurteilung.",
                ]
            ).map((reason) => (
              <li
                key={reason}
                className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed"
              >
                • {reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      {shouldShowAssessmentData && (
        <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg">
              Medizinische Zusammenfassung
            </p>
            <button
              type="button"
              onClick={() => alert("PDF-Download würde hier starten")}
              className="bg-[#486284] text-white rounded-[10px] px-4 py-2 hover:bg-[#3a4d68] transition-all flex items-center gap-2"
            >
              <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm">
                PDF
              </span>
            </button>
          </div>

          <div className="space-y-4">
            {patientData && (
              <div>
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-2">
                  Stammdaten
                </p>
                <div className="bg-[#eff2f6] rounded-[10px] p-3 space-y-1">
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                    <strong>Geburtsdatum:</strong> {patientData.birthMonth}/{patientData.birthYear}
                  </p>
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                    <strong>Größe/Gewicht:</strong> {patientData.height} cm / {patientData.weight} kg
                  </p>
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                    <strong>Geschlecht:</strong> {patientData.gender}
                  </p>
                  {patientData.isPregnant && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Schwanger:</strong> Ja
                    </p>
                  )}
                  {patientData.isBreastfeeding && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Stillend:</strong> Ja
                    </p>
                  )}
                  {patientData.allergies && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Allergien:</strong> {patientData.allergies}
                    </p>
                  )}
                  {patientData.medications && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Medikamente:</strong> {patientData.medications}
                    </p>
                  )}
                  {patientData.substanceInfluence && patientData.substanceInfluence !== "Nein" && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Einfluss:</strong> {patientData.substanceInfluence}
                    </p>
                  )}
                  {patientData.recentAbroad && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Ausland letzte 3 Monate:</strong> Ja
                      {patientData.recentAbroadDetails && ` (${patientData.recentAbroadDetails})`}
                    </p>
                  )}
                  {patientData.conditions.length > 0 && (
                    <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs">
                      <strong>Vorerkrankungen:</strong> {patientData.conditions.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {symptomDetails.length > 0 && (
              <div>
                <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-2">
                  Beschwerden
                </p>
                <div className="bg-[#eff2f6] rounded-[10px] p-3">
                  <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs leading-relaxed">
                    Patient klagt über{" "}
                    {symptomDetails.map((symptom, index) => (
                      <span key={symptom.id}>
                        <strong>
                          {symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}
                        </strong>
                        {" "}
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

            <div className="pt-3 border-t border-gray-200">
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-gray-500 text-xs">
                Erstellt am:{" "}
                {new Date().toLocaleDateString("de-DE", {
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
      )}

      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-[16px] p-5 md:p-6 mt-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#92400E] text-base mb-2">
          Wichtiger Hinweis
        </p>
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#92400E] text-sm leading-relaxed">
          Diese Einschätzung ist <strong>keine medizinische Diagnose</strong> und ersetzt nicht den Besuch bei einem Arzt.
          KI-Systeme können Fehler machen. Bei Unsicherheit oder Verschlechterung Ihres Zustands suchen Sie bitte
          umgehend medizinische Hilfe.
        </p>
      </div>

      <div className="mt-6 mb-6">
        <Button onClick={handleReset}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            Neue Einschätzung starten
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
