import { useNavigate, useSearchParams } from "react-router";
import { PhoneCall, Download } from "lucide-react";
import PageShell from "../components/PageShell";
import ResultCard from "../features/results/ResultCard";
import NearbyPracticeSearch from "../features/results/NearbyPracticeSearch";
import Button from "../components/Button";
import { createSpecialtyConfig, isMedicalSpecialty, TRIAGE_CONFIGS } from "../types/triage";
import { useAssessment } from "../lib/AssessmentContext";
import { getFrontendTriageRecommendation } from "../lib/specialtyRecommendation";
import type { CareLevel, MedicalSpecialty, RecommendedSpecialty } from "../types/triage";
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

function getVisibleMedicalSpecialties(specialties: RecommendedSpecialty[] = []) {
  return specialties
    .map((specialty) => specialty.specialty)
    .filter(isMedicalSpecialty)
    .filter((specialty, index, list) => list.indexOf(specialty) === index)
    .slice(0, 3);
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patientData, selectedSymptoms, symptomDetails, assessmentResult, resetAssessment } = useAssessment();

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
    const value = symptom.measurementValue ?? symptom.painLevel ?? 0;

    if (isAdministrativeSymptom(symptom.region, symptom.side)) {
      return "doctor";
    }

    if (isPsychSymptom(symptom)) {
      if (isSuicidalSymptom(symptom) && (symptom.measurementValue ?? 0) >= 8) return "emergency";
      return "doctor";
    }

    if (config.type === "temperature") {
      if (symptom.duration && value >= 40 && isMultipleDays(symptom.duration)) return "emergency";
      if (value >= 39) return "doctor";
      return "selfcare";
    }

    if (value >= 8) return "emergency";
    if (value >= 5) return "doctor";
    return "selfcare";
  };

  const getHighestCareLevel = (levels: CareLevel[]): CareLevel => {
    if (levels.includes("emergency")) return "emergency";
    if (levels.includes("specialist")) return "specialist";
    if (levels.includes("doctor")) return "doctor";
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
        selectedSymptoms: selectedSymptoms ?? [],
        symptomDetails,
      });

  const visibleSpecialties = getVisibleMedicalSpecialties(specialtyRecommendation?.recommendedSpecialties ?? []);
  const baselineCareLevel = calculateCareLevel();

  const recommendationCareLevel: CareLevel | null =
    specialtyRecommendation?.careLevel ?? null;

  const careLevel: CareLevel = isEmergency
    ? "emergency"
    : getHighestCareLevel([baselineCareLevel, recommendationCareLevel].filter(Boolean) as CareLevel[]);

  const config =
    careLevel === "specialist" && visibleSpecialties.length > 0
      ? createSpecialtyConfig(visibleSpecialties[0])
      : careLevel === "doctor"
      ? {
          ...TRIAGE_CONFIGS.doctor,
          title: "Ärztliche Versorgung empfohlen",
          description: hasAdministrativeSelection
            ? "Für Ihr Anliegen ist der Hausarzt bzw. die Allgemeinmedizin die passende Anlaufstelle."
            : "Ihre Beschwerden sollten ärztlich abgeklärt werden. Je nach Beschwerdebild kann eine fachärztliche Abklärung sinnvoll sein.",
      }
      : TRIAGE_CONFIGS[careLevel];
  const additionalSpecialtyCards = careLevel === "specialist" ? visibleSpecialties.slice(1) : visibleSpecialties;

  const callAction =
    careLevel === "emergency"
      ? { href: "tel:112", label: "112 anrufen", description: "Notruf" }
      : careLevel === "doctor"
        ? { href: "tel:116117", label: "116 117 anrufen", description: "Ärztlicher Bereitschaftsdienst" }
        : null;

  const showPsychSupport = hasPsychSelection(symptomDetails);
  const shouldShowReasons = careLevel !== "specialist";

  const getDurationLabel = (durationId: string) => {
    return DURATIONS.find((duration) => duration.id === durationId)?.label || durationId;
  };

  const getMeasurementSummary = (symptom: Symptom) => {
    const config = getMeasurementConfig(symptom.region, symptom.side);
    const value = symptom.measurementValue ?? symptom.painLevel ?? 0;

    if (config.type === "temperature") {
      return `${config.title} ${value.toFixed(1)} ${config.unit}`;
    }

    return `${config.title} ${value}/10`;
  };

  const handlePdfDownload = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

      const result = assessmentResult as
        | {
            careLevel?: string;
            recommendedSpecialty?: string;
            reasons?: string[];
            reviewSummary?: {
              plainLanguage: string;
              professionalSummary: string;
            };
            summary?: string;
          }
        | undefined;

      const validCareLevels = ["emergency", "doctor", "specialist", "selfcare"];

      const validMedicalSpecialties = [
        "home_care",
        "emergency_medicine",
        "general_practice",
        "internal_medicine",
        "cardiology",
        "neurology",
        "orthopedics",
        "gastroenterology",
        "pulmonology",
        "dermatology",
        "urology",
        "gynecology",
        "psychiatry",
        "pediatrics",
        "dentistry",
        "ophthalmology",
        "otolaryngology",
      ];

      const fallbackRecommendedSpecialty =
        careLevel === "emergency"
          ? "emergency_medicine"
          : careLevel === "selfcare"
            ? "home_care"
            : "general_practice";

      const safeCareLevel = validCareLevels.includes(result?.careLevel ?? "")
        ? result?.careLevel
        : careLevel;

      const safeRecommendedSpecialty = validMedicalSpecialties.includes(
        result?.recommendedSpecialty ?? "",
      )
        ? result?.recommendedSpecialty
        : (specialtyRecommendation?.recommendedSpecialties?.[0]?.specialty ?? fallbackRecommendedSpecialty);

      const fallbackReasons =
        result?.reasons?.length
          ? result.reasons.slice(0, 5)
          : [
              "Ihre Angaben wurden ausgewertet.",
              "Bei Verschlechterung oder Unsicherheit sollten Sie medizinische Hilfe suchen.",
            ];

      const plainLanguage =
        result?.reviewSummary?.plainLanguage?.trim() ||
        result?.summary?.trim() ||
        "Die Angaben wurden aufgenommen und strukturiert zusammengefasst.";

      const professionalSummary =
        result?.reviewSummary?.professionalSummary?.trim() ||
        [
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
                  const label = symptom.side
                    ? `${symptom.region} (${symptom.side})`
                    : symptom.region;

                  return `${label}, ${getMeasurementSummary(symptom)}${
                    symptom.duration ? `, ${getDurationLabel(symptom.duration)}` : ""
                  }`;
                })
                .join("\n")
            : "Keine Beschwerden vorhanden.",
        ].join("\n");

      const pdfPayload = {
        reviewSummary: {
          plainLanguage,
          professionalSummary,
        },
        triage: {
          careLevel: safeCareLevel,
          recommendedSpecialty: safeRecommendedSpecialty,
          reasons: fallbackReasons,
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

      console.log("PDF Payload:", pdfPayload);

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

      {additionalSpecialtyCards.map((specialty: MedicalSpecialty) => (
        <ResultCard
          key={specialty}
          config={createSpecialtyConfig(specialty)}
        />
      ))}

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

      <NearbyPracticeSearch careLevel={careLevel} specialties={visibleSpecialties} />

      {shouldShowReasons && (
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
      )}

      {shouldShowAssessmentData && (
        <div className="bg-white border-2 border-[#486284] rounded-[16px] p-5 md:p-6 mb-4">
          <p className="mb-4 font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg">
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

          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={handlePdfDownload} className="inline-flex items-center gap-2 px-5">
              <Download className="size-5 flex-shrink-0" aria-hidden="true" />
              <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-base whitespace-nowrap">
                PDF herunterladen
              </span>
            </Button>
          </div>
        </div>
      )}

      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-[16px] p-5 md:p-6 mt-4">
        <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#92400E] text-base mb-2">
          Wichtiger Hinweis
        </p>
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#92400E] text-sm leading-relaxed">
          Diese Einschätzung ist <strong>keine Diagnose</strong>. Bei Unsicherheit oder Verschlechterung suchen Sie bitte medizinische Hilfe.
        </p>
      </div>

      <div className="mt-6 mb-6 flex flex-col sm:flex-row gap-3 justify-end">
        <Button onClick={handleReset}>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-base">
            Neue Einschätzung starten
          </p>
        </Button>
      </div>
    </PageShell>
  );
}
