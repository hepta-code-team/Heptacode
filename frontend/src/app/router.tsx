import { Navigate, createBrowserRouter, useLocation } from "react-router";
import type { ReactElement } from "react";
import LandingPage from "../pages/LandingPage";
import PatientDataPage from "../pages/PatientDataPage";
import MedicalDataPage from "../pages/MedicalDataPage";
import SymptomSelectionPage from "../pages/SymptomSelectionPage";
import SymptomDetailsPage from "../pages/SymptomDetailsPage";
import ResultPage from "../pages/ResultPage";
import { useAssessment } from "../lib/AssessmentContext";
import { isValidPatientData } from "../lib/assessmentValidation";

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
    element: <LandingPage />,
  },
  {
    path: "/patient-data",
    element: <PatientDataPage />,
  },
  {
    path: "/medical-data",
    element: (
      <PatientDataRequiredRoute>
        <MedicalDataPage />
      </PatientDataRequiredRoute>
    ),
  },
  {
    path: "/symptom-selection",
    element: (
      <PatientDataRequiredRoute>
        <SymptomSelectionPage />
      </PatientDataRequiredRoute>
    ),
  },
  {
    path: "/symptom-details",
    element: (
      <PatientDataRequiredRoute>
        <SymptomDetailsPage />
      </PatientDataRequiredRoute>
    ),
  },
  {
    path: "/result",
    element: (
      <PatientDataRequiredRoute>
        <ResultPage />
      </PatientDataRequiredRoute>
    ),
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});