import { useNavigate, useLocation } from "react-router";
import { useAssessment } from "../lib/AssessmentContext";

const pages = [
  { path: "/", name: "Symptome wählen" },
  { path: "/patient-data", name: "Stammdaten eingeben" },
  { path: "/medical-data", name: "Medizinische Angaben" },
  { path: "/symptom-selection", name: "Beschwerden" },
  { path: "/symptom-details", name: "Details" },
  { path: "/result", name: "Auswertung" },
];

export default function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assessmentResult, selectedSymptoms } = useAssessment();
  const activePath = location.pathname === "/body-area" ? "/symptom-selection" : location.pathname;
  const currentIndex = pages.findIndex((p) => p.path === activePath);
  const isEmergencyResult =
    activePath === "/result" && new URLSearchParams(location.search).get("emergency") === "true";

  const canNavigateTo = (path: string | undefined) =>
    path !== "/symptom-details" || selectedSymptoms.length > 0;
  const previousPage = isEmergencyResult ? pages[0] : pages[currentIndex - 1];
  const nextPage = isEmergencyResult ? undefined : pages[currentIndex + 1];
  const canGoBack = isEmergencyResult || (currentIndex > 0 && canNavigateTo(previousPage?.path));
  const canGoForward =
    !isEmergencyResult &&
    currentIndex < pages.length - 1 &&
    canNavigateTo(nextPage?.path) &&
    (nextPage?.path !== "/result" || Boolean(assessmentResult));

  return (
    <div className="sticky left-0 right-0 top-0 z-10 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <button
          onClick={() => canGoBack && previousPage && navigate(previousPage.path)}
          disabled={!canGoBack}
          className={`p-2 ${
            canGoBack
              ? "text-app-text-primary hover:bg-gray-100"
              : "text-app-text-disabled cursor-not-allowed"
          } rounded-lg transition-all`}
          aria-label="Zurück"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <p
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-app-text-primary text-sm"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {pages[currentIndex]?.name}
          </p>
          <p className="text-xs text-app-text-subtle">
            {currentIndex + 1} / {pages.length}
          </p>
        </div>

        <button
          onClick={() => canGoForward && nextPage && navigate(nextPage.path)}
          disabled={!canGoForward}
          className={`p-2 ${
            canGoForward
              ? "text-app-text-primary hover:bg-gray-100"
              : "text-app-text-disabled cursor-not-allowed"
          } rounded-lg transition-all`}
          aria-label="Weiter"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}