import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AssessmentPayload, AssessmentResult, PatientData, SelectedSymptom, Symptom } from "../types/assessment";
import { apiClient } from "./apiClient";
import { hasCompleteSymptomDetails, hasRequiredSymptoms, isValidPatientData } from "./assessmentValidation";

const ASSESSMENT_STORAGE_KEY = "heptacheck.assessment.v1";
const ASSESSMENT_STORAGE_TTL_MS = 60 * 1000;
const ASSESSMENT_EXPIRY_WARNING_MS = 30 * 1000;

interface PersistedAssessmentState {
  patientData: PatientData | null;
  selectedSymptoms: SelectedSymptom[];
  symptomText: string;
  symptomDetails: Symptom[];
  assessmentResult: AssessmentResult | null;
  assessmentRequestKey: string | null;
}

interface StoredAssessment {
  state: PersistedAssessmentState;
  expiresAt: number;
}

const defaultPersistedAssessmentState: PersistedAssessmentState = {
  patientData: null,
  selectedSymptoms: [],
  symptomText: "",
  symptomDetails: [],
  assessmentResult: null,
  assessmentRequestKey: null,
};

const isBrowserStorageAvailable = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
};

function createAssessmentRequestKey(payload: AssessmentPayload): string {
  return JSON.stringify({
    patientData: payload.patientData,
    selectedSymptoms: payload.selectedSymptoms,
    symptomDetails: payload.symptomDetails.map((symptom) => ({
      region: symptom.region,
      side: symptom.side,
      details: symptom.details,
      measurementType: symptom.measurementType,
      measurementValue: symptom.measurementValue,
      duration: symptom.duration,
    })),
  });
}

function omitMoodFromPatientData(patientData: PatientData | null | undefined): PatientData | null {
  if (!patientData) {
    return null;
  }

  const { mood: _mood, ...patientDataWithoutMood } = patientData;

  return patientDataWithoutMood;
}

function normalizeAssessmentSymptomDetails(symptomDetails: Symptom[]): Symptom[] {
  return symptomDetails.map((symptom) => {
    const normalizedSymptom: Symptom = {
      id: symptom.id,
      region: symptom.region.trim(),
      side: symptom.side,
      measurementType: symptom.measurementType,
      measurementValue: symptom.measurementValue,
      duration: symptom.duration,
      active: symptom.active,
    };

    if (symptom.details?.trim()) {
      normalizedSymptom.details = symptom.details.trim();
    }

    return normalizedSymptom;
  });
}

function normalizePersistedAssessmentState(state: PersistedAssessmentState): PersistedAssessmentState {
  return {
    ...state,
    symptomDetails: normalizeAssessmentSymptomDetails(state.symptomDetails),
  };
}

function hasPersistableAssessmentData(state: PersistedAssessmentState) {
  return Boolean(
    state.patientData ||
      state.selectedSymptoms.length > 0 ||
      state.symptomText.trim() ||
      state.symptomDetails.length > 0 ||
      state.assessmentResult ||
      state.assessmentRequestKey,
  );
}

function readPersistedAssessmentState(): PersistedAssessmentState {
  try {
    window.localStorage.removeItem(ASSESSMENT_STORAGE_KEY);
  } catch {
    // Ignore unavailable legacy storage. Current assessment data uses sessionStorage.
  }

  if (!isBrowserStorageAvailable()) {
    return defaultPersistedAssessmentState;
  }

  try {
    const storedState = window.sessionStorage.getItem(ASSESSMENT_STORAGE_KEY);

    if (!storedState) {
      return defaultPersistedAssessmentState;
    }

    const storedAssessment = JSON.parse(storedState) as Partial<StoredAssessment>;

    if (
      !storedAssessment.state ||
      typeof storedAssessment.expiresAt !== "number" ||
      Date.now() >= storedAssessment.expiresAt
    ) {
      window.sessionStorage.removeItem(ASSESSMENT_STORAGE_KEY);
      return defaultPersistedAssessmentState;
    }

    const parsedState = storedAssessment.state;

    return normalizePersistedAssessmentState({
      patientData: parsedState.patientData ?? null,
      selectedSymptoms: Array.isArray(parsedState.selectedSymptoms) ? parsedState.selectedSymptoms : [],
      symptomText: typeof parsedState.symptomText === "string" ? parsedState.symptomText : "",
      symptomDetails: Array.isArray(parsedState.symptomDetails) ? parsedState.symptomDetails : [],
      assessmentResult: parsedState.assessmentResult ?? null,
      assessmentRequestKey: typeof parsedState.assessmentRequestKey === "string" ? parsedState.assessmentRequestKey : null,
    });
  } catch (error) {
    console.warn("Persistierte Ersteinschätzung konnte nicht geladen werden.", error);
    window.sessionStorage.removeItem(ASSESSMENT_STORAGE_KEY);
    return defaultPersistedAssessmentState;
  }
}

function writePersistedAssessmentState(state: PersistedAssessmentState) {
  if (!isBrowserStorageAvailable()) {
    return null;
  }

  try {
    const expiresAt = Date.now() + ASSESSMENT_STORAGE_TTL_MS;
    const storedAssessment: StoredAssessment = {
      state: normalizePersistedAssessmentState(state),
      expiresAt,
    };

    window.sessionStorage.setItem(
      ASSESSMENT_STORAGE_KEY,
      JSON.stringify(storedAssessment),
    );

    return expiresAt;
  } catch (error) {
    console.warn("Ersteinschätzung konnte nicht im Browser gespeichert werden.", error);
    return null;
  }
}

function clearPersistedAssessmentState() {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(ASSESSMENT_STORAGE_KEY);
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
  expiryWarningSecondsRemaining: number | null;
  hasAssessmentExpired: boolean;
  evaluationProgress: number;
  isEvaluating: boolean;
  submitAssessment: (details: Symptom[]) => Promise<AssessmentResult>;
  resetAssessment: () => void;
  refreshAssessmentExpiry: () => void;
  acknowledgeAssessmentExpiry: () => void;
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
  const [assessmentRequestKey, setAssessmentRequestKey] = useState<string | null>(
    initialPersistedState.current.assessmentRequestKey,
  );
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [expiryWarningSecondsRemaining, setExpiryWarningSecondsRemaining] = useState<number | null>(null);
  const [hasAssessmentExpired, setHasAssessmentExpired] = useState(false);
  const assessmentRequestVersion = useRef(0);
  const expiryTimeoutId = useRef<number | null>(null);
  const expiryWarningTimeoutId = useRef<number | null>(null);
  const expiryCountdownIntervalId = useRef<number | null>(null);

  const clearExpiryTimers = () => {
    if (expiryTimeoutId.current !== null) {
      window.clearTimeout(expiryTimeoutId.current);
      expiryTimeoutId.current = null;
    }

    if (expiryWarningTimeoutId.current !== null) {
      window.clearTimeout(expiryWarningTimeoutId.current);
      expiryWarningTimeoutId.current = null;
    }

    if (expiryCountdownIntervalId.current !== null) {
      window.clearInterval(expiryCountdownIntervalId.current);
      expiryCountdownIntervalId.current = null;
    }
  };

  const startExpiryWarning = (expiresAt: number) => {
    const updateCountdown = () => {
      setExpiryWarningSecondsRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };

    updateCountdown();
    expiryCountdownIntervalId.current = window.setInterval(updateCountdown, 1000);
  };

  const scheduleAssessmentExpiry = (expiresAt: number) => {
    clearExpiryTimers();
    setExpiryWarningSecondsRemaining(null);

    const remainingTime = expiresAt - Date.now();

    if (remainingTime <= 0) {
      expireAssessment();
      return;
    }

    const warningDelay = remainingTime - ASSESSMENT_EXPIRY_WARNING_MS;

    if (warningDelay <= 0) {
      startExpiryWarning(expiresAt);
    } else {
      expiryWarningTimeoutId.current = window.setTimeout(() => {
        startExpiryWarning(expiresAt);
      }, warningDelay);
    }

    expiryTimeoutId.current = window.setTimeout(() => {
      expireAssessment();
    }, remainingTime);
  };

  useEffect(() => {
    if (!shouldPersistAssessmentState.current) {
      shouldPersistAssessmentState.current = true;
      return;
    }

    const nextPersistedState = {
      patientData,
      selectedSymptoms,
      symptomText,
      symptomDetails,
      assessmentResult,
      assessmentRequestKey,
    };

    if (!hasPersistableAssessmentData(nextPersistedState)) {
      clearExpiryTimers();
      setExpiryWarningSecondsRemaining(null);
      clearPersistedAssessmentState();
      return clearExpiryTimers;
    }

    const expiresAt = writePersistedAssessmentState(nextPersistedState);

    if (expiresAt !== null) {
      scheduleAssessmentExpiry(expiresAt);
    }

    return clearExpiryTimers;
  }, [patientData, selectedSymptoms, symptomText, symptomDetails, assessmentResult, assessmentRequestKey]);

  const invalidateAssessmentResult = () => {
    assessmentRequestVersion.current += 1;
    setAssessmentResult(null);
    setAssessmentRequestKey(null);
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
    const normalizedDetails = normalizeAssessmentSymptomDetails(details);
    const hasChanged =
      JSON.stringify(normalizeAssessmentSymptomDetails(symptomDetails)) !== JSON.stringify(normalizedDetails);

    if (hasChanged) {
      invalidateAssessmentResult();
      setSymptomDetailsState(normalizedDetails);
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

    const normalizedDetails = normalizeAssessmentSymptomDetails(details);
    const payload: AssessmentPayload = {
      patientData: omitMoodFromPatientData(patientData) as PatientData,
      selectedSymptoms,
      symptomDetails: normalizedDetails,
    };
    const requestKey = createAssessmentRequestKey(payload);

    if (assessmentResult && assessmentRequestKey === requestKey) {
      setSymptomDetailsState(normalizedDetails);
      setEvaluationProgress(100);
      return assessmentResult;
    }

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

      setSymptomDetailsState(normalizedDetails);
      setAssessmentResult(result);
      setAssessmentRequestKey(requestKey);
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

  function clearAssessmentState(markExpired: boolean) {
    assessmentRequestVersion.current += 1;
    shouldPersistAssessmentState.current = false;
    clearExpiryTimers();
    clearPersistedAssessmentState();
    setExpiryWarningSecondsRemaining(null);
    setHasAssessmentExpired(markExpired);
    setPatientDataState(null);
    setSelectedSymptomsState([]);
    setSymptomText("");
    setSymptomDetailsState([]);
    setAssessmentResult(null);
    setAssessmentRequestKey(null);
    setEvaluationProgress(0);
    setIsEvaluating(false);
  }

  function resetAssessment() {
    clearAssessmentState(false);
  }

  function expireAssessment() {
    clearAssessmentState(true);
  }

  function refreshAssessmentExpiry() {
    const nextPersistedState = {
      patientData,
      selectedSymptoms,
      symptomText,
      symptomDetails,
      assessmentResult,
      assessmentRequestKey,
    };

    if (!hasPersistableAssessmentData(nextPersistedState)) {
      clearExpiryTimers();
      setExpiryWarningSecondsRemaining(null);
      clearPersistedAssessmentState();
      return;
    }

    const expiresAt = writePersistedAssessmentState(nextPersistedState);

    if (expiresAt !== null) {
      scheduleAssessmentExpiry(expiresAt);
    }
  }

  const acknowledgeAssessmentExpiry = () => {
    setHasAssessmentExpired(false);
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
        expiryWarningSecondsRemaining,
        hasAssessmentExpired,
        evaluationProgress,
        isEvaluating,
        submitAssessment,
        resetAssessment,
        refreshAssessmentExpiry,
        acknowledgeAssessmentExpiry,
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
