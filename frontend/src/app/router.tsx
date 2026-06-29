import { useEffect, useState } from "react";
import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router";
import type { ReactElement } from "react";
import LandingPage from "../pages/LandingPage";
import PatientDataPage from "../pages/PatientDataPage";
import MedicalDataPage from "../pages/MedicalDataPage";
import PreExistingConditionsPage from "../pages/PreExistingConditionsPage";
import SymptomSelectionPage from "../pages/SymptomSelectionPage";
import SymptomDetailsPage from "../pages/SymptomDetailsPage";
import ResultPage from "../pages/ResultPage";
import { useAssessment } from "../lib/AssessmentContext";
import { isValidPatientData } from "../lib/assessmentValidation";
import Modal from "../components/Modal";

function AssessmentExpiryRoute() {
  const location = useLocation();
  const [shouldReturnHome, setShouldReturnHome] = useState(false);
  const {
    expiryWarningSecondsRemaining,
    hasAssessmentExpired,
    resetAssessment,
    refreshAssessmentExpiry,
    acknowledgeAssessmentExpiry,
  } = useAssessment();
  const shouldRedirectHome = hasAssessmentExpired || shouldReturnHome;

  useEffect(() => {
    if (!shouldRedirectHome || location.pathname !== "/") {
      return;
    }

    acknowledgeAssessmentExpiry();
    setShouldReturnHome(false);
  }, [acknowledgeAssessmentExpiry, location.pathname, shouldRedirectHome]);

  const handleKeepSession = () => {
    refreshAssessmentExpiry();
  };

  const handleEndSession = () => {
    resetAssessment();
    setShouldReturnHome(true);
  };

  if (shouldRedirectHome && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Outlet />
      <Modal
        isOpen={expiryWarningSecondsRemaining !== null}
        onClose={refreshAssessmentExpiry}
        title="Sitzung läuft ab"
        subtitle="Ihre Angaben werden aus Datenschutzgründen automatisch in Kürze gelöscht."
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div
            className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-[#FEF3C7] font-['DM_Sans:Bold',sans-serif] text-3xl font-bold text-app-text-warning"
            aria-live="polite"
          >
            {expiryWarningSecondsRemaining ?? 0}
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleKeepSession}
              className="inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[#2f3e68] px-5 py-3 font-['DM_Sans:Bold',sans-serif] text-base font-bold text-white shadow-sm transition-all hover:bg-[#263457] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f3e68]/40"
            >
              Sitzung behalten
            </button>
            <button
              type="button"
              onClick={handleEndSession}
              className="inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[#df6662] px-5 py-3 font-['DM_Sans:Bold',sans-serif] text-base font-bold text-white shadow-sm transition-all hover:bg-[#cf5551] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df6662]/40"
            >
              Sitzung beenden
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function PageRoute({ children }: { children: ReactElement }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return children;
}

function PatientDataRequiredRoute({ children }: { children: ReactElement }) {
  const location = useLocation();
  const { patientData } = useAssessment();
  const isEmergencyResult =
    location.pathname === "/result" && new URLSearchParams(location.search).get("emergency") === "true";

  if (isEmergencyResult || isValidPatientData(patientData)) {
    return children;
  }

  return <Navigate to="/patient-data" replace />;
}

export const router = createBrowserRouter([
  {
    element: <AssessmentExpiryRoute />,
    children: [
      {
        path: "/",
        element: (
          <PageRoute>
            <LandingPage />
          </PageRoute>
        ),
      },
      {
        path: "/patient-data",
        element: (
          <PageRoute>
            <PatientDataPage />
          </PageRoute>
        ),
      },
      {
        path: "/medical-data",
        element: (
          <PatientDataRequiredRoute>
            <PageRoute>
              <MedicalDataPage />
            </PageRoute>
          </PatientDataRequiredRoute>
        ),
      },
      {
        path: "/pre-existing-conditions",
        element: (
          <PatientDataRequiredRoute>
            <PageRoute>
              <PreExistingConditionsPage />
            </PageRoute>
          </PatientDataRequiredRoute>
        ),
      },
      {
        path: "/symptom-selection",
        element: (
          <PatientDataRequiredRoute>
            <PageRoute>
              <SymptomSelectionPage />
            </PageRoute>
          </PatientDataRequiredRoute>
        ),
      },
      {
        path: "/symptom-details",
        element: (
          <PatientDataRequiredRoute>
            <PageRoute>
              <SymptomDetailsPage />
            </PageRoute>
          </PatientDataRequiredRoute>
        ),
      },
      {
        path: "/result",
        element: (
          <PatientDataRequiredRoute>
            <PageRoute>
              <ResultPage />
            </PageRoute>
          </PatientDataRequiredRoute>
        ),
      },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
