import { createContext, useContext, useState, ReactNode } from "react";
import type {
  AssessmentPayload,
  AssessmentResult,
  PatientData,
  SelectedSymptom,
  Symptom,
  SymptomDetailPayload,
} from "../types/assessment";
import { apiClient } from "./apiClient";

interface AssessmentContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  selectedSymptoms: SelectedSymptom[];
  setSelectedSymptoms: (symptoms: SelectedSymptom[]) => void;
  symptomDetails: Symptom[];
  setSymptomDetails: (details: Symptom[]) => void;
  assessmentResult: AssessmentResult | null;
  setAssessmentResult: (result: AssessmentResult | null) => void;
  submitAssessment: (details: SymptomDetailPayload[]) => Promise<AssessmentResult>;
  submitTextAssessment: (
    text: string,
    inputType?: "text" | "speech",
  ) => Promise<AssessmentResult>;
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);
  const [symptomDetails, setSymptomDetails] = useState<Symptom[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const submitAssessment = async (details: SymptomDetailPayload[]) => {
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

  const submitTextAssessment = async (
    text: string,
    inputType: "text" | "speech" = "text",
  ) => {
    if (!patientData) {
      throw new Error("Patientendaten fehlen. Bitte gehen Sie zurück und füllen Sie die Stammdaten aus.");
    }

    const result = await apiClient.post<{
      careLevel: AssessmentResult["careLevel"];
      recommendedSpecialty?: AssessmentResult["recommendedSpecialty"];
      reasons: string[];
      reviewSummary?: AssessmentResult["reviewSummary"];
      recommendedSpecialties?: AssessmentResult["recommendedSpecialties"];
      aiUnavailable?: boolean;
    }>("/api/v1/triage/evaluate", {
      patientData,
      text,
      inputType,
    });

    const reviewSummary = result.reviewSummary ?? {
      plainLanguage: "Die Angaben wurden strukturiert ausgewertet.",
      professionalSummary: `Freitextangaben:\n${text.trim()}`,
    };

    const normalizedResult: AssessmentResult = {
      careLevel: result.careLevel,
      recommendedSpecialty: result.recommendedSpecialty,
      reasons:
        result.reasons.length > 0
          ? result.reasons
          : ["Die Angaben wurden ausgewertet. Bitte suchen Sie bei Verschlechterung medizinische Hilfe."],
      reviewSummary,
      recommendedSpecialties: result.recommendedSpecialties,
      summary: reviewSummary.plainLanguage,
      aiUnavailable: result.aiUnavailable,
      createdAt: new Date().toISOString(),
    };

    setSelectedSymptoms([]);
    setSymptomDetails([]);
    setAssessmentResult(normalizedResult);

    return normalizedResult;
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
        setAssessmentResult,
        submitAssessment,
        submitTextAssessment,
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
