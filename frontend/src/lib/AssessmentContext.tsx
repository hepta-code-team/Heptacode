import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AssessmentPayload, AssessmentResult, PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import { apiClient } from "./apiClient";
import { hasCompleteSymptomDetails, hasRequiredSymptoms, isValidPatientData } from "./assessmentValidation";

const ASSESSMENT_STORAGE_KEY = "heptacheck.assessment.v1";

interface PersistedAssessmentState {
  patientData: PatientData | null;
  selectedSymptoms: SelectedSymptom[];
  symptomText: string;
  symptomDetails: Symptom[];
  assessmentResult: AssessmentResult | null;
}

const defaultPersistedAssessmentState: PersistedAssessmentState = {
  patientData: null,
  selectedSymptoms: [],
  symptomText: "",
  symptomDetails: [],
  assessmentResult: null,
};

const isBrowserStorageAvailable = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function readPersistedAssessmentState(): PersistedAssessmentState {
  if (!isBrowserStorageAvailable()) {
    return defaultPersistedAssessmentState;
  }

  try {
    const storedState = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY);

    if (!storedState) {
      return defaultPersistedAssessmentState;
    }

    const parsedState = JSON.parse(storedState) as Partial<PersistedAssessmentState>;

    return {
      patientData: parsedState.patientData ?? null,
      selectedSymptoms: Array.isArray(parsedState.selectedSymptoms) ? parsedState.selectedSymptoms : [],
      symptomText: typeof parsedState.symptomText === "string" ? parsedState.symptomText : "",
      symptomDetails: Array.isArray(parsedState.symptomDetails) ? parsedState.symptomDetails : [],
      assessmentResult: parsedState.assessmentResult ?? null,
    };
  } catch (error) {
    console.warn("Persistierte Ersteinschätzung konnte nicht geladen werden.", error);
    return defaultPersistedAssessmentState;
  }
}

function writePersistedAssessmentState(state: PersistedAssessmentState) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Ersteinschätzung konnte nicht im Browser gespeichert werden.", error);
  }
}

function clearPersistedAssessmentState() {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(ASSESSMENT_STORAGE_KEY);
  } catch (error) {
    console.warn("Persistierte Ersteinschätzung konnte nicht gelöscht werden.", error);
  }
}

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
  const initialPersistedState = useRef<PersistedAssessmentState>(readPersistedAssessmentState());
  const shouldPersistAssessmentState = useRef(true);
  const [patientData, setPatientDataState] = useState<PatientData | null>(initialPersistedState.current.patientData);
  const [selectedSymptoms, setSelectedSymptomsState] = useState<SelectedSymptom[]>(
    initialPersistedState.current.selectedSymptoms,
  );
  const [symptomText, setSymptomText] = useState(initialPersistedState.current.symptomText);
  const [symptomDetails, setSymptomDetailsState] = useState<Symptom[]>(initialPersistedState.current.symptomDetails);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(
    initialPersistedState.current.assessmentResult,
  );
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const assessmentRequestVersion = useRef(0);

  useEffect(() => {
    if (!shouldPersistAssessmentState.current) {
      shouldPersistAssessmentState.current = true;
      return;
    }

    writePersistedAssessmentState({
      patientData,
      selectedSymptoms,
      symptomText,
      symptomDetails,
      assessmentResult,
    });
  }, [patientData, selectedSymptoms, symptomText, symptomDetails, assessmentResult]);

  const invalidateAssessmentResult = () => {
    assessmentRequestVersion.current += 1;
    setAssessmentResult(null);
    setEvaluationProgress(0);
    setIsEvaluating(false);
  };

  const setPatientData = (data: PatientData) => {
    const hasChanged = JSON.stringify(patientData) !== JSON.stringify(data);

    if (hasChanged) {
      invalidateAssessmentResult();
      setPatientDataState(data);
    }
  };

  const setSelectedSymptoms = (symptoms: SelectedSymptom[]) => {
    const hasChanged = JSON.stringify(selectedSymptoms) !== JSON.stringify(symptoms);

    if (hasChanged) {
      invalidateAssessmentResult();
      setSelectedSymptomsState(symptoms);
    }
  };

  const setSymptomDetails = (details: Symptom[]) => {
    const hasChanged = JSON.stringify(symptomDetails) !== JSON.stringify(details);

    if (hasChanged) {
      invalidateAssessmentResult();
      setSymptomDetailsState(details);
    }
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
    shouldPersistAssessmentState.current = false;
    clearPersistedAssessmentState();
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