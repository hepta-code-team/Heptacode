import { createContext, useContext, useState, type ReactNode } from "react";
import { apiClient } from "./apiClient";
import type { TriageSymptom } from "../../../shared/symptom.types";
import type { PatientData } from "../../../shared/patientData.types";
import type { AssessmentPayload, AssessmentResult } from "../types/assessment";

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  selectedSymptoms: TriageSymptom[];
  setSelectedSymptoms: (symptoms: TriageSymptom[]) => void;
  symptomDetails: TriageSymptom[];
  setSymptomDetails: (details: TriageSymptom[]) => void;
  assessmentResult: AssessmentResult | null;
  submitAssessment: (symptoms: AssessmentPayload["symptomDetails"]) => Promise<AssessmentResult>;
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
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