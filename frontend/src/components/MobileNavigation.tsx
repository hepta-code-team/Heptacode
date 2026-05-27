import { useNavigate, useLocation } from "react-router";

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
  const activePath = location.pathname === "/body-area" ? "/symptom-selection" : location.pathname;
  const currentIndex = pages.findIndex((p) => p.path === activePath);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pages.length - 1;

  return (
    <div className="sticky top-0 left-0 right-0 bg-white border-b border-gray-200 py-3 px-4 md:hidden z-10">
      <div className="flex items-center justify-between">
        <button
          onClick={() => canGoBack && navigate(pages[currentIndex - 1].path)}
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
          onClick={() => canGoForward && navigate(pages[currentIndex + 1].path)}
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
