import { useNavigate, useLocation } from "react-router";
import { useAssessment } from "../lib/AssessmentContext";
import {
  hasCompleteSymptomDetails,
  hasRequiredSymptoms,
  isValidPatientData,
} from "../lib/assessmentValidation";

const pages = [
  { path: "/", name: "Notfallcheck" },
  { path: "/patient-data", name: "Stammdaten" },
  { path: "/medical-data", name: "Weitere Angaben" },
  { path: "/pre-existing-conditions", name: "Vorerkrankungen" },
  { path: "/symptom-selection", name: "Beschwerden" },
  { path: "/symptom-details", name: "Dauer und Stärke" },
  { path: "/result", name: "Ergebnis" },
];

export default function MobileNavigation() {
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
    "/pre-existing-conditions": true,
    "/symptom-selection": hasRequiredSymptoms(selectedSymptoms),
    "/symptom-details": hasCompleteSymptomDetails(symptomDetails),
    "/result": true,
  };
  const hasCompletedAssessment = Boolean(assessmentResult) && !isEvaluating;
  const completedThroughPath = hasCompletedAssessment || isEmergencyResult
    ? "/result"
    : isEvaluating || evaluationProgress > 0
      ? "/symptom-details"
      : undefined;
  const completedThroughIndex = completedThroughPath
    ? pages.findIndex((page) => page.path === completedThroughPath)
    : -1;
  const hasValidPatientData = isValidPatientData(patientData);

  const canNavigateToStep = (pagePath: string) => {
    const isSymptomDetailsStep = pagePath === "/symptom-details";
    const isEvaluationStep = pagePath === "/result";
    const requiresPatientData = pagePath !== "/" && pagePath !== "/patient-data";

    return isEmergencyResult
      ? pagePath === "/"
      : (!requiresPatientData || hasValidPatientData) &&
        (!isSymptomDetailsStep || hasRequiredSymptoms(selectedSymptoms)) &&
        (!isEvaluationStep || hasCompletedAssessment);
  };

  const previousPage = isEmergencyResult ? pages[0] : pages[currentIndex - 1];
  const nextPage = isEmergencyResult ? undefined : pages[currentIndex + 1];
  const canGoBack = isEmergencyResult || (currentIndex > 0 && canNavigateToStep(previousPage?.path ?? ""));
  const canGoForward =
    !isEmergencyResult &&
    currentIndex < pages.length - 1 &&
    canNavigateToStep(nextPage?.path ?? "");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(72,98,132,0.12)] md:hidden"
      aria-label="Mobile Schritte"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => canGoBack && previousPage && navigate(previousPage.path)}
          disabled={!canGoBack}
          className={`rounded-lg p-2 transition-all ${
            canGoBack
              ? "text-app-text-primary hover:bg-gray-100"
              : "cursor-not-allowed text-app-text-disabled"
          }`}
          aria-label="Zurück"
        >
          <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-1.5">
            {pages.map((page, index) => {
              const isActive = index === currentIndex;
              const isComplete = completedThroughIndex >= 0
                ? index <= completedThroughIndex && !isActive
                : currentIndex >= 0 && index < currentIndex && (!isEmergencyResult || index === 0);
              const isValid = validSteps[page.path];
              const isBypassedEmergencyStep = isEmergencyResult && page.path !== "/" && page.path !== "/result";
              const isVisuallyComplete = isComplete && !isBypassedEmergencyStep && isValid;
              const dotColor = isVisuallyComplete
                ? "bg-[#A3E64D]"
                : isActive
                  ? "bg-[#486284]"
                  : "bg-gray-300";

              return (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => {
                    if (isActive || !canNavigateToStep(page.path)) {
                      return;
                    }

                    navigate(page.path);
                  }}
                  disabled={!isActive && !canNavigateToStep(page.path)}
                  className="flex size-5 items-center justify-center disabled:cursor-not-allowed"
                  aria-label={`Gehe zu ${page.name}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span
                    className={`rounded-full transition-all ${dotColor} ${
                      isActive ? "size-3.5" : "size-2.5"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => canGoForward && nextPage && navigate(nextPage.path)}
          disabled={!canGoForward}
          className={`rounded-lg p-2 transition-all ${
            canGoForward
              ? "text-app-text-primary hover:bg-gray-100"
              : "cursor-not-allowed text-app-text-disabled"
          }`}
          aria-label="Weiter"
        >
          <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}