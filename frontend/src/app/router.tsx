import { useEffect } from "react";
import { Navigate, Outlet, createBrowserRouter, useLocation, useNavigate } from "react-router";
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
  const navigate = useNavigate();
  const {
    expiryWarningSecondsRemaining,
    hasAssessmentExpired,
    refreshAssessmentExpiry,
    acknowledgeAssessmentExpiry,
  } = useAssessment();

  useEffect(() => {
    if (!hasAssessmentExpired) {
      return;
    }

    navigate("/", { replace: true });
    acknowledgeAssessmentExpiry();
  }, [acknowledgeAssessmentExpiry, hasAssessmentExpired, navigate]);

  if (hasAssessmentExpired) {
    return null;
  }

  return (
    <>
      <Outlet />
      <Modal
        isOpen={expiryWarningSecondsRemaining !== null}
        onClose={refreshAssessmentExpiry}
        title="Sitzung läuft ab"
        subtitle="Ihre Angaben werden aus Datenschutzgründen gleich gelöscht."
        maxWidth="max-w-sm"
        showCloseButton
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-[#FEF3C7] font-['DM_Sans:Bold',sans-serif] text-3xl font-bold text-app-text-warning"
            aria-live="polite"
          >
            {expiryWarningSecondsRemaining ?? 0}
          </div>
          <p className="font-['DM_Sans:Medium',sans-serif] text-sm font-medium leading-relaxed text-app-text-body">
            Schließen Sie dieses Fenster, um den Timer zurückzusetzen. Nach Ablauf werden die Daten gelöscht und Sie kommen zurück zur Startseite.
          </p>
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
