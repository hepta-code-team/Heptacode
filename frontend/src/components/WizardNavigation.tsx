import { useNavigate, useLocation } from "react-router";
import { Check, X } from "lucide-react";
import { useAssessment } from "../lib/AssessmentContext";
import { hasCompleteSymptomDetails, hasRequiredSymptoms, isValidPatientData } from "../lib/assessmentValidation";

const pages = [
  { path: "/", name: "Notfallcheck" },
  { path: "/patient-data", name: "Stammdaten" },
  { path: "/medical-data", name: "Weitere Angaben" },
  { path: "/symptom-selection", name: "Beschwerden" },
  { path: "/symptom-details", name: "Dauer und Stärke" },
  { path: "/result", name: "Ergebnis" },
];

export default function WizardNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    assessmentResult,
    evaluationProgress,
    isEvaluating,
    patientData,
    selectedSymptoms,
    symptomDetails,
  } = useAssessment();
  const activePath = location.pathname === "/body-area" ? "/symptom-selection" : location.pathname;
  const currentIndex = pages.findIndex((p) => p.path === activePath);
  const isEmergencyResult =
    activePath === "/result" && new URLSearchParams(location.search).get("emergency") === "true";
  const validSteps: Record<string, boolean> = {
    "/": true,
    "/patient-data": isValidPatientData(patientData),
    "/medical-data": true,
    "/symptom-selection": hasRequiredSymptoms(selectedSymptoms),
    "/symptom-details": hasCompleteSymptomDetails(symptomDetails),
    "/result": true,
  };
  const hasCompletedAssessment = Boolean(assessmentResult) && !isEvaluating;
  const navigationFrameBorderColor = "border-gray-300";
  const completedThroughPath = hasCompletedAssessment || isEmergencyResult
    ? "/result"
    : isEvaluating || evaluationProgress > 0
      ? "/symptom-details"
      : undefined;
  const completedThroughIndex = completedThroughPath
    ? pages.findIndex((page) => page.path === completedThroughPath)
    : -1;
  const hasValidPatientData = isValidPatientData(patientData);

  return (
      <div className={`fixed bottom-6 left-1/2 z-20 hidden min-w-[60vw] -translate-x-1/2 rounded-2xl border
      bg-white px-8 py-3 shadow-md transition-colors md:block ${navigationFrameBorderColor}`}>
        <div className="mx-auto max-w-5xl">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}>
          {pages.map((page, index) => {
            const isActive = index === currentIndex;
            const isComplete = completedThroughIndex >= 0
              ? index <= completedThroughIndex && !isActive
              : currentIndex >= 0 && index < currentIndex && (!isEmergencyResult || index === 0);
            const isValid = validSteps[page.path];
            const isBypassedEmergencyStep = isEmergencyResult && page.path !== "/" && page.path !== "/result";
            const isEmergencyHighlightedStep = isEmergencyResult && index > 0 && page.path !== "/result";
            const isVisuallyComplete = isComplete && !isBypassedEmergencyStep && isValid;
            const hasValidationError = isComplete && !isValid && !isBypassedEmergencyStep;
            const isSymptomDetailsStep = page.path === "/symptom-details";
            const isEvaluationStep = page.path === "/result";
            const requiresPatientData = page.path !== "/" && page.path !== "/patient-data";
            const canNavigateToStep = isEmergencyResult
              ? page.path === "/"
              : (!requiresPatientData || hasValidPatientData) &&
                (!isSymptomDetailsStep || hasRequiredSymptoms(selectedSymptoms)) &&
                (!isEvaluationStep || hasCompletedAssessment);
            const showsEvaluationProgress =
              isEvaluationStep && !isEmergencyResult && evaluationProgress > 0 && (isEvaluating || isActive);
            const hasFinishedEvaluation = hasCompletedAssessment || isEmergencyResult;
            const showsLabel = isEvaluationStep
              ? isActive && hasFinishedEvaluation
              : isActive || (isComplete && !isBypassedEmergencyStep);
            const labelColor = hasValidationError
              ? "text-red-500"
              : isVisuallyComplete
                ? "text-[#A3E64D]"
                : isActive
                  ? "text-app-text-primary"
                  : "text-transparent";
            const barColor = hasValidationError
              ? "bg-red-500"
              : isVisuallyComplete || isEmergencyHighlightedStep
                ? "bg-[#A3E64D]"
                : isActive
                  ? "bg-[#486284]"
                  : "bg-gray-200 group-hover:bg-gray-300";

            return (
            <button
              key={page.path}
              onClick={() => {
                if (isActive) {
                  return;
                }

                if (!canNavigateToStep) {
                  return;
                }

                navigate(page.path);
              }}
              disabled={!isActive && !canNavigateToStep}
              className="group flex min-w-0 flex-col items-stretch gap-1.5 text-left"
              aria-label={`Gehe zu ${page.name}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`flex h-4 items-center justify-center truncate text-center font-['DM_Sans:SemiBold',sans-serif] text-[13px] font-semibold transition-colors ${labelColor}`}
                style={{ fontVariationSettings: "'opsz' 14" }}
                aria-hidden={!showsLabel}
              >
                {hasValidationError ? (
                  <X className="size-4" strokeWidth={3} aria-hidden="true" />
                ) : isVisuallyComplete ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                ) : (
                  page.name
                )}
              </span>
              {showsEvaluationProgress ? (
                <span className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className="block h-full rounded-full bg-[#486284] transition-[width] duration-500 ease-out"
                    style={{ width: `${evaluationProgress}%` }}
                  />
                </span>
              ) : (
                <span className={`h-2 rounded-full transition-all ${barColor}`} />
              )}
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}