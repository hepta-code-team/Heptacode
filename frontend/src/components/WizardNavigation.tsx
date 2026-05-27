import { useNavigate, useLocation } from "react-router";

const pages = [
  { path: "/", name: "Red Flags" },
  { path: "/patient-data", name: "Stammdaten" },
  { path: "/medical-data", name: "Medizinische Angaben" },
  { path: "/symptom-selection", name: "Beschwerden" },
  { path: "/symptom-details", name: "Details" },
  { path: "/result", name: "Auswertung" },
];

export default function WizardNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname === "/body-area" ? "/symptom-selection" : location.pathname;
  const currentIndex = pages.findIndex((p) => p.path === activePath);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 hidden md:block">
      <div className="max-w-4xl mx-auto px-8">
        <div className="flex items-center justify-center gap-3">
          {pages.map((page, index) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className={`transition-all ${
                index === currentIndex
                  ? "w-3 h-3 bg-[#486284] rounded-full"
                  : "w-3 h-3 bg-gray-300 rounded-full hover:bg-gray-400"
              }`}
              aria-label={`Gehe zu ${page.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
