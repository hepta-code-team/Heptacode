import { createContext, useContext, useState, ReactNode } from "react";
import type { PatientData, SelectedSymptom, Symptom } from "../types/assessment";

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  selectedSymptoms: SelectedSymptom[];
  setSelectedSymptoms: (symptoms: SelectedSymptom[]) => void;
  symptomDetails: Symptom[];
  setSymptomDetails: (details: Symptom[]) => void;
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);


/*
This function uses a global React-State to pass its data. By using a state for all components,
the data doesn't have to get passed as a prop from one page to another, or from one functio
to another.
The Assessment Provider wraps around the whole Router. That means, that every Pages that gets
routed has access to the AssessmentContext. It is a global state provider inside the React-App.
So a browser-reload or app-reload clears the state. This could be fixed using sessionStorage im Browser.
*/

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<Symptom[]>([]);

  const resetAssessment = () => {
    setPatientData(null);
    setSelectedSymptoms([]);
    setSymptomDetails([]);
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
