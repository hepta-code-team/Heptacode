import { useNavigate, useLocation } from "react-router";
import { Check } from "lucide-react";

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
  const activePath = location.pathname === "/body-area" ? "/symptom-selection" : location.pathname;
  const currentIndex = pages.findIndex((p) => p.path === activePath);

  return (
    <div className="fixed bottom-8 left-8 right-8 hidden bg-white px-8 py-3  md:block">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}>
          {pages.map((page, index) => {
            const isActive = index === currentIndex;
            const isComplete = currentIndex >= 0 && index < currentIndex;
            const isReached = currentIndex >= 0 && index <= currentIndex;

            return (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="group flex min-w-0 flex-col items-stretch gap-1.5 text-left"
              aria-label={`Gehe zu ${page.name}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`flex h-4 items-center justify-center truncate text-center font-['DM_Sans:SemiBold',sans-serif] text-[13px] font-semibold transition-colors ${
                  isActive || isComplete ? "text-app-text-primary" : "text-transparent"
                }`}
                style={{ fontVariationSettings: "'opsz' 14" }}
                aria-hidden={!isActive && !isComplete}
              >
                {isComplete ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : page.name}
              </span>
              <span
                className={`h-2 rounded-full transition-all ${
                  isReached ? "bg-[#486284]" : "bg-gray-200 group-hover:bg-gray-300"
                }`}
              />
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
