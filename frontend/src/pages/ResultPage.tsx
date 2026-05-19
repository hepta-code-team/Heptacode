import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import Button from "../components/Button";
import NearbyPracticeSearch from "../features/results/NearbyPracticeSearch";
import { TRIAGE_CONFIGS } from "../types/triage";
import { useAssessment } from "../lib/AssessmentContext";
import { getFrontendTriageRecommendation } from "../lib/specialtyRecommendation";
import type { CareLevel, RecommendedSpecialty } from "../types/triage";
import { DURATIONS, getMeasurementConfig, isAdministrativeSymptom } from "../features/symptoms/symptoms.constants";
import type { Symptom } from "../types/assessment";

function isPsychSymptom(symptom: Symptom) {
  const text = `${symptom.region} ${symptom.side ?? ""}`.toLowerCase();

  return (
    text.includes("psych") ||
    text.includes("angst") ||
    text.includes("panik") ||
    text.includes("sucht") ||
    text.includes("niedergeschlagenheit") ||
    text.includes("suizid")
  );
}

function isSuicidalSymptom(symptom: Symptom) {
  return `${symptom.region} ${symptom.side ?? ""}`.toLowerCase().includes("suizid");
}

function hasPsychSelection(symptoms: Symptom[]) {
  return symptoms.some(isPsychSymptom);
}

function getVisibleSpecialties(specialties: RecommendedSpecialty[] = []) {
  const withoutEmergency = specialties.filter((specialty) => specialty.specialty !== "emergency");
  const actualSpecialists = withoutEmergency.filter((specialty) => specialty.specialty !== "primary_care");

  if (actualSpecialists.length > 0) {
    return actualSpecialists.slice(0, 3);
  }

  return withoutEmergency.slice(0, 1);
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, selectedSymptoms, symptomDetails, resetAssessment } = useAssessment();

  const isEmergency = searchParams.get("emergency") === "true";

  const hasAdministrativeSelection = selectedSymptoms.some((symptom) =>
    symptom.sides?.length
      ? symptom.sides.some((side) => isAdministrativeSymptom(symptom.region, side))
      : isAdministrativeSymptom(symptom.region, symptom.side)
  );

  const hasCapturedSymptoms = selectedSymptoms.length > 0 || symptomDetails.length > 0 || hasAdministrativeSelection;
  const shouldShowAssessmentData = !isEmergency && !hasAdministrativeSelection;

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
  const isShortDuration = (duration: string) => ["today", "days"].includes(duration);
  const isLongDuration = (duration: string) => ["week", "weeks"].includes(duration);

  const getSymptomCareLevel = (symptom: Symptom): CareLevel => {
    const config = getMeasurementConfig(symptom.region, symptom.side);

    if (isAdministrativeSymptom(symptom.region, symptom.side)) {
      return "doctor";
    }

    if (isPsychSymptom(symptom)) {
      if (isSuicidalSymptom(symptom) && symptom.measurementValue >= 8) return "emergency";
      return "doctor";
    }

    if (config.type === "temperature") {
      if (symptom.measurementValue >= 40 && isMultipleDays(symptom.duration)) return "emergency";
      if (symptom.measurementValue >= 39) return "doctor";
      return "selfcare";
    }

    if (symptom.measurementValue >= 9) return "emergency";

    if (isLongDuration(symptom.duration) && symptom.measurementValue >= 3) {
      return "specialist";
    }

    if (isShortDuration(symptom.duration) && symptom.measurementValue >= 1 && symptom.measurementValue <= 7) {
      return "doctor";
    }

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
    if (hasAdministrativeSelection) return "doctor";
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

  const visibleSpecialties = getVisibleSpecialties(specialtyRecommendation?.recommendedSpecialties ?? []);
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
          description: hasAdministrativeSelection
            ? "Für Ihr Anliegen ist der Hausarzt bzw. die Allgemeinmedizin die passende Anlaufstelle."
            : "Ihre Beschwerden sollten ärztlich abgeklärt werden. Je nach Beschwerdebild kann eine fachärztliche Abklärung sinnvoll sein.",
        }
      : TRIAGE_CONFIGS[careLevel];

  const callAction =
    careLevel === "emergency"
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
        : null;

  const showPsychSupport = hasPsychSelection(symptomDetails);

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

      {showPsychSupport && (
        <div className="bg-[#eff2f6] rounded-[16px] p-5 md:p-6 mb-4">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-2">
            Unterstützung bei psychischer Belastung
          </p>
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed mb-3">
            Wenn Sie sich psychisch stark belastet fühlen, können Sie zusätzlich anonym und kostenfrei mit der TelefonSeelsorge sprechen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {["0800 1110111", "0800 1110222", "116 123"].map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replaceAll(" ", "")}`}
                className="rounded-[12px] bg-white px-4 py-3 text-center font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] hover:bg-[#dde3ea]"
              >
                {phone}
              </a>
            ))}
          </div>
        </div>
      )}

      {!isEmergency && visibleSpecialties.length > 0 ? (
        <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-3">
            Empfohlene Anlaufstelle
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleSpecialties.map((specialty) => (
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
        specialties={visibleSpecialties}
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
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg mb-4">
            Medizinische Zusammenfassung
          </p>

          {symptomDetails.length > 0 && (
            <div className="bg-[#eff2f6] rounded-[10px] p-3">
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs leading-relaxed">
                Patient klagt über{" "}
                {symptomDetails.map((symptom, index) => (
                  <span key={symptom.id}>
                    <strong>
                      {symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region}
                    </strong>{" "}
                    ({getMeasurementSummary(symptom)}
                    {symptom.duration && `, ${getDurationLabel(symptom.duration)}`})
                    {index < symptomDetails.length - 1 && (index === symptomDetails.length - 2 ? " und " : ", ")}
                  </span>
                ))}
                .
              </p>
            </div>
          )}
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
