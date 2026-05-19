<<<<<<< HEAD
import { createContext, useContext, useState, type ReactNode } from "react";
import { apiClient } from "./apiClient";
import type { TriageSymptom } from "../../../shared/symptom.types";
import type { PatientData } from "../../../shared/patientData.types";
import type { AssessmentPayload, AssessmentResult } from "../types/assessment";
=======
import { createContext, useContext, useState, ReactNode } from "react";
import type { AssessmentPayload, AssessmentResult, PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import { apiClient } from "./apiClient";
>>>>>>> origin/dev

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
<<<<<<< HEAD
  selectedSymptoms: TriageSymptom[];
  setSelectedSymptoms: (symptoms: TriageSymptom[]) => void;
  symptomDetails: TriageSymptom[];
  setSymptomDetails: (details: TriageSymptom[]) => void;
  assessmentResult: AssessmentResult | null;
  submitAssessment: (symptoms: AssessmentPayload["symptomDetails"]) => Promise<AssessmentResult>;
=======
  selectedSymptoms: SelectedSymptom[];
  setSelectedSymptoms: (symptoms: SelectedSymptom[]) => void;
  symptomDetails: Symptom[];
  setSymptomDetails: (details: Symptom[]) => void;
  assessmentResult: AssessmentResult | null;
  setAssessmentResult: (result: AssessmentResult | null) => void;
  submitAssessment: (details: Symptom[]) => Promise<AssessmentResult>;
>>>>>>> origin/dev
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
<<<<<<< HEAD
  const [selectedSymptoms, setSelectedSymptoms] = useState<TriageSymptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<TriageSymptom[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const submitAssessment = async (symptoms: AssessmentPayload["symptomDetails"]) => {
    if (!patientData) {
      throw new Error("Patientendaten fehlen.");
    }

    setSymptomDetails(symptoms);

    const payload: AssessmentPayload = {
      patientData,
      selectedSymptoms,
      symptomDetails: symptoms,
    };

    const result = await apiClient.post<AssessmentResult>("/assessments", payload);
    setAssessmentResult(result);
=======
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<Symptom[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const submitAssessment = async (details: Symptom[]) => {
    if (!patientData) {
      throw new Error("Patientendaten fehlen. Bitte gehen Sie zurück und füllen Sie die Stammdaten aus.");
    }

    const payload: AssessmentPayload = {
      patientData,
      selectedSymptoms,
      symptomDetails: details,
    };

    console.log("Assessment payload", payload);

    const result = await apiClient.post<AssessmentResult>("/assessments", payload);

    setSymptomDetails(details);
    setAssessmentResult(result);

>>>>>>> origin/dev
    return result;
  };

  const resetAssessment = () => {
    setPatientData(null);
    setSelectedSymptoms([]);
    setSymptomDetails([]);
    setAssessmentResult(null);
  };

  return (
    <AssessmentContext.Provider
      value={{
        patientData,
        setPatientData,
        selectedSymptoms,
        setSelectedSymptoms,
        symptomDetails,
        setSymptomDetails,
        assessmentResult,
<<<<<<< HEAD
=======
        setAssessmentResult,
>>>>>>> origin/dev
        submitAssessment,
        resetAssessment,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error("useAssessment must be used within an AssessmentProvider");
  }
  return context;
}