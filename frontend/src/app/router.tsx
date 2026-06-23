import { useEffect } from "react";
import { Navigate, createBrowserRouter, useLocation } from "react-router";
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
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});