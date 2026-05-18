import { createContext, useContext, useState, ReactNode } from "react";
<<<<<<< HEAD
import type { AssessmentPayload, AssessmentResult, PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import { apiClient } from "./apiClient";
=======
import type { TriageSymptom } from "../../../shared/symptom.types";
import type { PatientData } from "../../../shared/patientData.types";
>>>>>>> origin/dev

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
<<<<<<< HEAD
  selectedSymptoms: SelectedSymptom[];
  setSelectedSymptoms: (symptoms: SelectedSymptom[]) => void;
  symptomDetails: Symptom[];
  setSymptomDetails: (details: Symptom[]) => void;
  assessmentResult: AssessmentResult | null;
  setAssessmentResult: (result: AssessmentResult | null) => void;
  submitAssessment: (details: Symptom[]) => Promise<AssessmentResult>;
=======
  selectedSymptoms: TriageSymptom[];
  setSelectedSymptoms: (symptoms: TriageSymptom[]) => void;
  symptomDetails: TriageSymptom[];
  setSymptomDetails: (details: TriageSymptom[]) => void;
>>>>>>> origin/dev
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
<<<<<<< HEAD
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

    return result;
  };
=======
  const [selectedSymptoms, setSelectedSymptoms] = useState<TriageSymptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<TriageSymptom[]>([]);
>>>>>>> origin/dev

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
        setAssessmentResult,
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
