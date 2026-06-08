import { createContext, useContext, useRef, useState, ReactNode } from "react";
import type { AssessmentPayload, AssessmentResult, PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import { apiClient } from "./apiClient";
import { hasCompleteSymptomDetails, hasRequiredSymptoms, isValidPatientData } from "./assessmentValidation";

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  selectedSymptoms: SelectedSymptom[];
  setSelectedSymptoms: (symptoms: SelectedSymptom[]) => void;
  symptomText: string;
  setSymptomText: (text: string) => void;
  symptomDetails: Symptom[];
  setSymptomDetails: (details: Symptom[]) => void;
  assessmentResult: AssessmentResult | null;
  setAssessmentResult: (result: AssessmentResult | null) => void;
  evaluationProgress: number;
  isEvaluating: boolean;
  submitAssessment: (details: Symptom[]) => Promise<AssessmentResult>;
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientDataState] = useState<PatientData | null>(null);
  const [selectedSymptoms, setSelectedSymptomsState] = useState<SelectedSymptom[]>([]);
  const [symptomText, setSymptomText] = useState("");
  const [symptomDetails, setSymptomDetailsState] = useState<Symptom[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const assessmentRequestVersion = useRef(0);

  const invalidateAssessmentResult = () => {
    assessmentRequestVersion.current += 1;
    setAssessmentResult(null);
    setEvaluationProgress(0);
    setIsEvaluating(false);
  };

  const setPatientData = (data: PatientData) => {
    if (JSON.stringify(patientData) !== JSON.stringify(data)) {
      invalidateAssessmentResult();
    }

    setPatientDataState(data);
  };

  const setSelectedSymptoms = (symptoms: SelectedSymptom[]) => {
    if (JSON.stringify(selectedSymptoms) !== JSON.stringify(symptoms)) {
      invalidateAssessmentResult();
    }

    setSelectedSymptomsState(symptoms);
  };

  const setSymptomDetails = (details: Symptom[]) => {
    if (JSON.stringify(symptomDetails) !== JSON.stringify(details)) {
      invalidateAssessmentResult();
    }

    setSymptomDetailsState(details);
  };

  const submitAssessment = async (details: Symptom[]) => {
    if (!isValidPatientData(patientData)) {
      throw new Error("Bitte füllen Sie zuerst alle Pflichtfelder der Stammdaten vollständig aus.");
    }

    if (!hasRequiredSymptoms(selectedSymptoms)) {
      throw new Error("Bitte wählen Sie zuerst mindestens eine Beschwerde aus.");
    }

    if (!hasCompleteSymptomDetails(details)) {
      throw new Error("Bitte füllen Sie zuerst Dauer und Stärke für alle Beschwerden vollständig aus.");
    }

    const payload: AssessmentPayload = {
      patientData,
      selectedSymptoms,
      symptomDetails: details,
    };

    console.log("Assessment payload", payload);

    const requestVersion = assessmentRequestVersion.current + 1;
    assessmentRequestVersion.current = requestVersion;

    setAssessmentResult(null);
    setEvaluationProgress(8);
    setIsEvaluating(true);

    const progressInterval = window.setInterval(() => {
      if (assessmentRequestVersion.current !== requestVersion) {
        return;
      }

      setEvaluationProgress((currentProgress) =>
        Math.min(currentProgress + Math.max(1, (92 - currentProgress) * 0.12), 92),
      );
    }, 400);

    try {
      const result = await apiClient.post<AssessmentResult>("/assessments", payload);

      if (assessmentRequestVersion.current !== requestVersion) {
        throw new Error("Die Auswertung wurde zurückgesetzt.");
      }

      setSymptomDetailsState(details);
      setAssessmentResult(result);
      setEvaluationProgress(100);

      return result;
    } catch (error) {
      if (assessmentRequestVersion.current === requestVersion) {
        setEvaluationProgress(0);
      }
      throw error;
    } finally {
      window.clearInterval(progressInterval);
      if (assessmentRequestVersion.current === requestVersion) {
        setIsEvaluating(false);
      }
    }
  };

  const resetAssessment = () => {
    assessmentRequestVersion.current += 1;
    setPatientDataState(null);
    setSelectedSymptomsState([]);
    setSymptomText("");
    setSymptomDetailsState([]);
    setAssessmentResult(null);
    setEvaluationProgress(0);
    setIsEvaluating(false);
  };

  return (
    <AssessmentContext.Provider
      value={{
        patientData,
        setPatientData,
        selectedSymptoms,
        setSelectedSymptoms,
        symptomText,
        setSymptomText,
        symptomDetails,
        setSymptomDetails,
        assessmentResult,
        setAssessmentResult,
        evaluationProgress,
        isEvaluating,
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