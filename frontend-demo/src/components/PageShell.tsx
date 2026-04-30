import { ReactNode } from "react";
import WizardNavigation from "./WizardNavigation";
import MobileNavigation from "./MobileNavigation";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showWizard?: boolean;
  maxWidth?: "md" | "lg" | "xl";
}

export default function PageShell({
  children,
  title,
  subtitle,
  onBack,
  showWizard = true,
  maxWidth = "xl",
}: PageShellProps) {
  const maxWidthClasses = {
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
  };

  return (
    <div className="bg-white size-full overflow-auto pb-20 md:pb-24">
      <MobileNavigation />

      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-6 md:px-8 py-5 md:py-6`}>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#486284] hover:text-[#3a4d68] mb-3 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-['DM_Sans:Medium',sans-serif] font-medium text-sm">Zurück</span>
          </button>
        )}

        {title && (
          <h1
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-xl md:text-2xl mb-2"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-sm mb-4"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {subtitle}
          </p>
        )}

        {children}
      </div>

      {showWizard && <WizardNavigation />}
    </div>
  );
}
