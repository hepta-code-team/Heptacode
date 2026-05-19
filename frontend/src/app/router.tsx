import { createBrowserRouter, Navigate } from "react-router";
import LandingPage from "../pages/LandingPage";
import PatientDataPage from "../pages/PatientDataPage";
import MedicalDataPage from "../pages/MedicalDataPage";
import SymptomSelectionPage from "../pages/SymptomSelectionPage";
import SymptomDetailsPage from "../pages/SymptomDetailsPage";
import ResultPage from "../pages/ResultPage";

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
    element: <MedicalDataPage />,
  },
  {
    path: "/body-area",
    element: <Navigate to="/symptom-selection" replace />,
  },
  {
    path: "/symptom-selection",
    element: <SymptomSelectionPage />,
  },
  {
    path: "/symptom-details",
    element: <SymptomDetailsPage />,
  },
  {
    path: "/result",
    element: <ResultPage />,
  },
  {
    path: "/stammdaten",
    element: <Navigate to="/patient-data" replace />,
  },
  {
    path: "/body-regions",
    element: <Navigate to="/symptom-selection" replace />,
  },
  {
    path: "/evaluation",
    element: <Navigate to="/result" replace />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
