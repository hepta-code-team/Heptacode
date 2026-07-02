import { ReactNode } from "react";
import WizardNavigation from "./WizardNavigation";
import MobileNavigation from "./MobileNavigation";
import heptaCheckLogo from "../assets/heptacheck-logo.png";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  showWizard?: boolean;
}

const pageContentMaxWidthClass = "max-w-5xl";

export default function PageShell({
  children,
  title,
  subtitle,
  onBack,
  onSkip,
  skipLabel = "Überspringen",
  showWizard = true,
}: PageShellProps) {
  const navigationActionClass =
    "inline-flex min-h-6 items-center gap-2 text-app-text-primary transition-all hover:text-app-text-primary-strong";
  const navigationIconClass = "h-4 w-4 flex-shrink-0";
  const navigationTextClass = "font-['DM_Sans:Medium',sans-serif] text-sm font-medium leading-6";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-white">
      <MobileNavigation />

      <header className="shrink-0 bg-white px-6 py-2 md:px-8 md:py-2" aria-label="HeptaCheck">
        <img
          src={heptaCheckLogo}
          alt="HeptaCheck"
          className="h-auto w-28 max-w-[50vw] md:w-36 lg:w-44"
        />
      </header>
      <div aria-hidden="true" className="page-header-divider h-0.5 shrink-0" />

      <main className="relative flex-1 overflow-x-hidden bg-white pb-20 md:pb-24">
        <div className={`${pageContentMaxWidthClass} relative z-[1] mx-auto w-full px-6 py-5 md:px-8 md:py-6`}>
          {(onBack || onSkip) && (
            <div className="mb-3 hidden items-center justify-between gap-4 md:flex">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className={navigationActionClass}
                >
                  <svg className={navigationIconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className={navigationTextClass}>Zurück</span>
                </button>
              ) : (
                <span aria-hidden="true" />
              )}

              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className={`${navigationActionClass} hidden md:inline-flex`}
                >
                  <span className={navigationTextClass}>{skipLabel}</span>
                  <svg className={navigationIconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {title && (
            <h1
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-xl md:text-2xl mb-2"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {title}
            </h1>
          )}

          {subtitle && (
            <p
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-sm mb-4"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {subtitle}
            </p>
          )}

          {children}
        </div>
      </main>

      {showWizard && <WizardNavigation />}
    </div>
  );
}
