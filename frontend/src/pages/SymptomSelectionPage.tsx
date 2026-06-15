import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Brain, Check, Mic, MicOff, Sparkles, Trash2, X } from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import Modal from "../components/Modal";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import { useAssessment } from "../lib/AssessmentContext";
import { extractSymptomsFromText } from "../lib/symptomExtractionApi";
import {
  BODY_AREA_LABELS,
  BODY_AREA_REGION_IDS,
  EMERGENCY_SYMPTOM_OPTIONS,
  getBodyRegionsForCategory,
  MAX_SYMPTOMS,
  type BodyAreaCategory,
} from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom } from "../../../shared/symptom.types";
import type { TriageSymptom } from "../../../shared/symptom.types";


const MAX_RECORDING_DURATION_MS = 120_000;
const MAX_RECORDING_DURATION_SECONDS = MAX_RECORDING_DURATION_MS / 1000;
const MAX_SYMPTOM_TEXT_CHARACTERS = 500;
const SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR = `Bitte beschreiben Sie Ihre Symptome mit maximal ${MAX_SYMPTOM_TEXT_CHARACTERS} Zeichen.`;

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
};

type BrowserSpeechRecognitionErrorEvent = {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const supportingAreas = [
  {
    id: "general" as const,
    label: BODY_AREA_LABELS.general,
    description: "Fieber, Übelkeit, Schwindel oder Schwäche",
    icon: Sparkles,
  },
  {
    id: "mental" as const,
    label: BODY_AREA_LABELS.mental,
    description: "Angst, Stimmung oder seelische Belastung",
    icon: Brain,
  },
];


function getCharacterCount(text: string) {
  return text.length;
}

function formatRecordingDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function limitTextToMaxCharacters(text: string) {
  return text.slice(0, MAX_SYMPTOM_TEXT_CHARACTERS);
}

function exceedsSymptomTextLimit(text: string) {
  return getCharacterCount(text) > MAX_SYMPTOM_TEXT_CHARACTERS;
}

type VerticalProgressIconButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  ariaPressed?: boolean;
  title?: string;
  className: string;
  fillClassName?: string;
  progress?: number;
  showProgress?: boolean;
};

/**
 * Circular icon button with a progress fill that grows from bottom to top.
 *
 * The fill mirrors the horizontal loading bar pattern used elsewhere, but is
 * shaped for the compact dictation modal actions.
 */
function VerticalProgressIconButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaPressed,
  title,
  className,
  fillClassName = "bg-white/25",
  progress = 0,
  showProgress = false,
}: VerticalProgressIconButtonProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-lg transition-all disabled:cursor-not-allowed ${className}`}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      title={title}
    >
      <span
        className={`absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out ${fillClassName}`}
        style={{ height: showProgress ? `${clampedProgress}%` : "0%" }}
        aria-hidden="true"
      />
      <span className="relative z-[1] flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}

/**
 * Reconstructs textarea content before React receives the changed value.
 *
 * This lets beforeInput prevent oversized text instead of briefly accepting it
 * and then trimming after the DOM has already changed.
 */
function insertTextAtSelection(text: string, insertedText: string, selectionStart: number, selectionEnd: number) {
  return `${text.slice(0, selectionStart)}${insertedText}${text.slice(selectionEnd)}`;
}

function getTextAreaInputData(event: FormEvent<HTMLTextAreaElement>) {
  const nativeEvent = event.nativeEvent as InputEvent;

  return nativeEvent.data ?? "";
}

function isTextRemoval(event: FormEvent<HTMLTextAreaElement>) {
  const nativeEvent = event.nativeEvent as InputEvent;

  return nativeEvent.inputType.startsWith("delete");
}

/**
 * Predicts the next textarea value for a normal typing event.
 *
 * The browser exposes inserted text on the native InputEvent while the DOM value
 * still represents the previous state during beforeInput.
 */
function getTextWithPendingTextAreaInput(event: FormEvent<HTMLTextAreaElement>, inputText: string) {
  const { selectionEnd, selectionStart, value } = event.currentTarget;

  return insertTextAtSelection(value, inputText, selectionStart, selectionEnd);
}

/**
 * Predicts the next textarea value for paste handling.
 *
 * Paste needs its own helper because clipboard text is not available through
 * InputEvent.data in the same reliable way as keyboard input.
 */
function getTextWithPendingTextAreaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
  const { selectionEnd, selectionStart, value } = event.currentTarget;
  const pastedText = event.clipboardData.getData("text");

  return insertTextAtSelection(value, pastedText, selectionStart, selectionEnd);
}

function getSymptomKey(symptom: SelectedSymptom) {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
}

/**
 * Deduplicates AI-extracted symptoms while preserving their original order.
 *
 * The detail page only supports the configured maximum number of symptoms, so
 * the extraction result is capped before it is written into shared state.
 */
function getUniqueExtractedSymptoms(symptoms: TriageSymptom[]): TriageSymptom[] {
  const seenSymptomKeys = new Set<string>();
  const uniqueSymptoms: TriageSymptom[] = [];

  for (const symptom of symptoms) {
    const symptomKey = getSymptomKey(symptom);

    if (!seenSymptomKeys.has(symptomKey)) {
      seenSymptomKeys.add(symptomKey);
      uniqueSymptoms.push(symptom);
    }

    if (uniqueSymptoms.length >= MAX_SYMPTOMS) {
      break;
    }
  }

  return uniqueSymptoms;
}

/**
 * Validates the category query parameter before it is used as state.
 *
 * This protects deep links from rendering an unsupported body-area category.
 */
function isBodyAreaCategory(value: string | null): value is BodyAreaCategory {
  return Boolean(value && value in BODY_AREA_REGION_IDS);
}

/**
 * Interactive body selector used for coarse symptom localization.
 *
 * The SVG uses keyboard handlers and button-like roles so body-region selection
 * remains available beyond pointer-only interactions.
 */
function AnatomyFigure({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: BodyAreaCategory | null;
  onSelect: (category: BodyAreaCategory) => void;
}) {
  const partFill = (category: BodyAreaCategory) => selectedCategory === category ? "#486284" : "#ffffff";
  const partStroke = (category: BodyAreaCategory) => selectedCategory === category ? "#486284" : "#d7dee7";
  const labelFill = (category: BodyAreaCategory) => selectedCategory === category ? "#ffffff" : "#486284";

  const activate = (category: BodyAreaCategory) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(category);
    }
  };

  const interactiveClass = "cursor-pointer outline-none transition-opacity hover:opacity-90 focus-visible:opacity-90";

  return (
    <svg
      viewBox="0 0 220 350"
      className="mx-auto h-[360px] w-[230px] sm:h-[330px] sm:w-[210px] md:h-[390px] md:w-[245px]"
      role="img"
      aria-label="Klickbare Körperauswahl"
    >
      <defs>
        <filter id="body-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#486284" floodOpacity="0.12" />
        </filter>
      </defs>

      <g
        role="button"
        tabIndex={0}
        aria-label="Arme auswählen"
        aria-pressed={selectedCategory === "arms"}
        onClick={() => onSelect("arms")}
        onKeyDown={activate("arms")}
        className={interactiveClass}
      >
        <path
          d="M55 103 C47 109 43 119 42 132 L37 203 C36 218 43 228 54 228 C65 228 70 219 70 205 L75 135 C76 121 81 109 90 102 L90 93 Z"
          fill={partFill("arms")}
          stroke={partStroke("arms")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path
          d="M165 103 C173 109 177 119 178 132 L183 203 C184 218 177 228 166 228 C155 228 150 219 150 205 L145 135 C144 121 139 109 130 102 L130 93 Z"
          fill={partFill("arms")}
          stroke={partStroke("arms")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <text x="54" y="168" textAnchor="middle" fill={labelFill("arms")} fontSize="13" fontWeight="700" transform="rotate(-86 54 168)">Arm</text>
        <text x="166" y="168" textAnchor="middle" fill={labelFill("arms")} fontSize="13" fontWeight="700" transform="rotate(86 166 168)">Arm</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Beine auswählen"
        aria-pressed={selectedCategory === "legs"}
        onClick={() => onSelect("legs")}
        onKeyDown={activate("legs")}
        className={interactiveClass}
      >
        <path
          d="M66 217 H104 L101 318 C101 333 92 343 80 343 C68 343 61 333 62 318 Z"
          fill={partFill("legs")}
          stroke={partStroke("legs")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path
          d="M116 217 H154 L158 318 C159 333 152 343 140 343 C128 343 119 333 119 318 Z"
          fill={partFill("legs")}
          stroke={partStroke("legs")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <text x="82" y="282" textAnchor="middle" fill={labelFill("legs")} fontSize="13" fontWeight="700" transform="rotate(-90 82 282)">Bein</text>
        <text x="138" y="282" textAnchor="middle" fill={labelFill("legs")} fontSize="13" fontWeight="700" transform="rotate(90 138 282)">Bein</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Torso auswählen"
        aria-pressed={selectedCategory === "torso"}
        onClick={() => onSelect("torso")}
        onKeyDown={activate("torso")}
        className={interactiveClass}
      >
        <path
          d="M75 89 C82 83 94 80 110 80 C126 80 138 83 145 89 C151 95 154 104 154 116 L154 208 C154 215 151 219 144 219 L76 219 C69 219 66 215 66 208 L66 116 C66 104 69 95 75 89 Z"
          fill={partFill("torso")}
          stroke={partStroke("torso")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path d="M86 91 C97 96 123 96 134 91" fill="none" stroke="#d7dee7" strokeWidth="4" strokeLinecap="round" />
        <text x="110" y="151" textAnchor="middle" fill={labelFill("torso")} fontSize="15" fontWeight="700">Torso</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Hüfte auswählen"
        aria-pressed={selectedCategory === "hips"}
        onClick={() => onSelect("hips")}
        onKeyDown={activate("hips")}
        className={interactiveClass}
      >
        <path
          d="M65.5 174.5 C77 188 91.5 194.5 110 194.5 C128.5 194.5 143 188 154.5 174.5 L156 208 C156 216 152 220 144 220 L76 220 C68 220 64 216 64 208 Z"
          fill={partFill("hips")}
          stroke={partStroke("hips")}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <text x="110" y="208" textAnchor="middle" dominantBaseline="middle" fill={labelFill("hips")} fontSize="13" fontWeight="700">Hüfte</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Kopf und Hals auswählen"
        aria-pressed={selectedCategory === "headNeck"}
        onClick={() => onSelect("headNeck")}
        onKeyDown={activate("headNeck")}
        className={`${interactiveClass} sm:hidden`}
      >
        <path
          d="M80 42 C80 20 94 7 110 7 C126 7 140 20 140 42 C140 64 127 78 110 78 C93 78 80 64 80 42 Z"
          fill={partFill("headNeck")}
          stroke={partStroke("headNeck")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path
          d="M92 72 C99 84 121 84 128 72 L130 96 C122 104 98 104 90 96 Z"
          fill={partFill("headNeck")}
          stroke={partStroke("headNeck")}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <text x="110" y="38" textAnchor="middle" fill={labelFill("headNeck")} fontSize="13" fontWeight="700">Kopf +</text>
        <text x="110" y="55" textAnchor="middle" fill={labelFill("headNeck")} fontSize="13" fontWeight="700">Hals</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Hals auswählen"
        aria-pressed={selectedCategory === "neck"}
        onClick={() => onSelect("neck")}
        onKeyDown={activate("neck")}
        className={`${interactiveClass} hidden sm:block`}
      >
        <path
          d="M94 72 C100 82 120 82 126 72 L128 94 C121 101 99 101 92 94 Z"
          fill={partFill("neck")}
          stroke={partStroke("neck")}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <text x="110" y="89" textAnchor="middle" dominantBaseline="middle" fill={labelFill("neck")} fontSize="13" fontWeight="700">Hals</text>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Kopf auswählen"
        aria-pressed={selectedCategory === "head"}
        onClick={() => onSelect("head")}
        onKeyDown={activate("head")}
        className={`${interactiveClass} hidden sm:block`}
      >
        <path
          d="M80 42 C80 20 94 7 110 7 C126 7 140 20 140 42 C140 64 127 78 110 78 C93 78 80 64 80 42 Z"
          fill={partFill("head")}
          stroke={partStroke("head")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <text x="110" y="34" textAnchor="middle" fill={labelFill("head")} fontSize="13" fontWeight="700">Kopf</text>
      </g>
    </svg>
  );
}

export default function SymptomSelectionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = isBodyAreaCategory(searchParams.get("category"))
    ? searchParams.get("category") as BodyAreaCategory
    : null;
  const {
    selectedSymptoms: contextSymptoms,
    setSelectedSymptoms: setContextSymptoms,
    patientData,
    symptomText,
    setSymptomText,
    setSymptomDetails: setContextSymptomDetails,
  } = useAssessment();
  const [selectedCategory, setSelectedCategory] = useState<BodyAreaCategory | null>(initialCategory);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>(contextSymptoms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symptomTextDraft, setSymptomTextDraft] = useState(symptomText);
  const [isExtractingSymptoms, setIsExtractingSymptoms] = useState(false);
  const [symptomExtractionProgress, setSymptomExtractionProgress] = useState(0);
  const [isRecordingSymptoms, setIsRecordingSymptoms] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [symptomTextError, setSymptomTextError] = useState<string | null>(null);
  const symptomOptionsRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingTimerIntervalRef = useRef<number | null>(null);
  const symptomExtractionProgressIntervalRef = useRef<number | null>(null);
  const symptomExtractionRequestVersionRef = useRef(0);
  const recordedTextRef = useRef("");

  const selectedCategoryLabel = selectedCategory ? BODY_AREA_LABELS[selectedCategory] : "";
  const filteredRegions = useMemo(() => getBodyRegionsForCategory(selectedCategory), [selectedCategory]);
  const shouldShowInlineOptions = false;
  const symptomTextCharacterCount = useMemo(() => getCharacterCount(symptomTextDraft), [symptomTextDraft]);
  const formattedRecordingElapsed = formatRecordingDuration(recordingElapsedSeconds);
  const formattedMaxRecordingDuration = formatRecordingDuration(MAX_RECORDING_DURATION_SECONDS);
  const actionButtonProgress = symptomExtractionProgress;
  const symptomTextAreaClassName = `w-full h-40 bg-[#eff2f6] rounded-[16px] p-4 resize-none border-none outline-none font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-base disabled:cursor-not-allowed disabled:text-app-text-muted ${
    isExtractingSymptoms ? "focus:ring-0" : "focus:ring-2 focus:ring-[#486284]"
  }`;

  /**
   * Updates the free-text symptom description while enforcing the hard limit.
   *
   * The limit is checked here as a fallback for browsers or input paths that do
   * not pass through beforeInput or paste handling.
   */
  const handleSymptomTextChange = (text: string) => {
    if (exceedsSymptomTextLimit(text)) {
      setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
      return;
    }

    setSymptomTextDraft(text);
    setSymptomText(text);

    if (symptomTextError === SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR) {
      setSymptomTextError(null);
    }
  };

  /**
   * Prevents keyboard input that would exceed the symptom text limit.
   *
   * Blocking before the DOM value changes avoids flicker and keeps screen-reader
   * announcements aligned with the final accepted value.
   */
  const handleSymptomTextBeforeInput = (event: FormEvent<HTMLTextAreaElement>) => {
    if (isTextRemoval(event)) {
      return;
    }

    const inputText = getTextAreaInputData(event);

    if (!inputText) {
      return;
    }

    const nextText = getTextWithPendingTextAreaInput(event, inputText);

    if (exceedsSymptomTextLimit(nextText)) {
      event.preventDefault();
      setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
    }
  };

  /**
   * Handles pasted text by trimming to the maximum supported length.
   *
   * Paste can add a large amount of text at once, so it is normalized separately
   * from single-character keyboard input.
   */
  const handleSymptomTextPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const nextText = getTextWithPendingTextAreaPaste(event);

    if (exceedsSymptomTextLimit(nextText)) {
      event.preventDefault();
      const limitedText = limitTextToMaxCharacters(nextText);
      setSymptomTextDraft(limitedText);
      setSymptomText(limitedText);
      setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
    }
  };

  const clearRecordingTimeout = () => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const clearRecordingTimerInterval = () => {
    if (recordingTimerIntervalRef.current !== null) {
      window.clearInterval(recordingTimerIntervalRef.current);
      recordingTimerIntervalRef.current = null;
    }
  };

  const clearSymptomExtractionProgressInterval = () => {
    if (symptomExtractionProgressIntervalRef.current !== null) {
      window.clearInterval(symptomExtractionProgressIntervalRef.current);
      symptomExtractionProgressIntervalRef.current = null;
    }
  };

  const cancelSymptomExtraction = () => {
    symptomExtractionRequestVersionRef.current += 1;
    clearSymptomExtractionProgressInterval();
    setIsExtractingSymptoms(false);
    setSymptomExtractionProgress(0);
  };

  const resetRecordingTimer = () => {
    clearRecordingTimerInterval();
    setRecordingElapsedSeconds(0);
  };

  const stopSymptomRecording = () => {
    clearRecordingTimeout();
    clearRecordingTimerInterval();

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    setIsRecordingSymptoms(false);
  };

  const startRecordingTimer = () => {
    resetRecordingTimer();
    recordingTimerIntervalRef.current = window.setInterval(() => {
      setRecordingElapsedSeconds((elapsedSeconds) => Math.min(elapsedSeconds + 1, MAX_RECORDING_DURATION_SECONDS));
    }, 1000);
  };

  const appendTranscript = (baseText: string, transcript: string) => {
    const normalizedBaseText = baseText.trim();
    const normalizedTranscript = transcript.trim();

    if (!normalizedTranscript) {
      return limitTextToMaxCharacters(normalizedBaseText);
    }

    const combinedTranscript = normalizedBaseText ? `${normalizedBaseText} ${normalizedTranscript}` : normalizedTranscript;

    return limitTextToMaxCharacters(combinedTranscript);
  };

  /**
   * Starts or stops browser speech recognition for symptom dictation.
   *
   * The implementation keeps final transcript text separate from interim text so
   * partial recognition updates can be displayed without duplicating words.
   */
  const handleToggleSymptomRecording = () => {
    if (isRecordingSymptoms) {
      stopSymptomRecording();
      return;
    }

    if (symptomTextCharacterCount >= MAX_SYMPTOM_TEXT_CHARACTERS) {
      setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSymptomTextError("Spracheingabe wird von diesem Browser nicht unterstützt. Bitte nutzen Sie den Freitext.");
      return;
    }

    const recognition = new SpeechRecognition();
    recordedTextRef.current = symptomTextDraft.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "de-DE";

    recognition.onstart = () => {
      setIsRecordingSymptoms(true);
      startRecordingTimer();
      setSymptomTextError(null);
    };

    // Keep interim transcripts visible without committing them until the browser marks them final.
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript = appendTranscript(finalTranscript, transcript);
        } else {
          interimTranscript = appendTranscript(interimTranscript, transcript);
        }
      }

      if (finalTranscript) {
        recordedTextRef.current = appendTranscript(recordedTextRef.current, finalTranscript);
      }

      const nextSymptomText = appendTranscript(recordedTextRef.current, interimTranscript);
      setSymptomTextDraft(nextSymptomText);
      setSymptomText(nextSymptomText);

      if (getCharacterCount(nextSymptomText) >= MAX_SYMPTOM_TEXT_CHARACTERS && (finalTranscript || interimTranscript)) {
        setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
        stopSymptomRecording();
      }
    };

    recognition.onerror = (event) => {
      // Browser speech errors are user-facing because permissions and service availability vary by device.
      clearRecordingTimeout();
      clearRecordingTimerInterval();
      setIsRecordingSymptoms(false);
      speechRecognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSymptomTextError("Bitte erlauben Sie den Mikrofonzugriff, um Symptome diktieren zu können.");
        return;
      }

      if (event.error !== "no-speech" && event.error !== "aborted") {
        setSymptomTextError("Die Spracheingabe wurde unterbrochen. Bitte versuchen Sie es erneut oder nutzen Sie den Freitext.");
      }
    };

    recognition.onend = () => {
      clearRecordingTimeout();
      clearRecordingTimerInterval();
      setIsRecordingSymptoms(false);
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    recordingTimeoutRef.current = window.setTimeout(() => {
      stopSymptomRecording();
    }, MAX_RECORDING_DURATION_MS);

    try {
      recognition.start();
    } catch (error) {
      clearRecordingTimeout();
      resetRecordingTimer();
      speechRecognitionRef.current = null;
      setIsRecordingSymptoms(false);
      setSymptomTextError(error instanceof Error ? error.message : "Die Spracheingabe konnte nicht gestartet werden.");
    }
  };

  /**
   * Cleans up timers and active speech recognition when the page unmounts.
   * Browser speech APIs can continue firing callbacks after navigation unless
   * they are explicitly stopped and dereferenced.
   */
  useEffect(() => {
    return () => {
      symptomExtractionRequestVersionRef.current += 1;
      clearRecordingTimeout();
      clearRecordingTimerInterval();
      clearSymptomExtractionProgressInterval();
      speechRecognitionRef.current?.abort();
    };
  }, []);

  /**
   * Selects a coarse body area and syncs it into the URL.
   * Keeping the category in search params makes the screen shareable and lets
   * browser navigation restore the currently opened body area.
   */
  const handleCategorySelect = (category: BodyAreaCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSearchParams({});
      return;
    }

    setSelectedCategory(category);
    setSearchParams({ category });

    // On mobile, move the newly opened options into view after React has rendered them.
    if (window.innerWidth < 768) {
      window.setTimeout(() => {
        symptomOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  /**
   * Adds or removes a specific symptom selection.
   * Emergency suboptions short-circuit into the emergency result, while normal
   * symptoms are capped to the maximum count supported by the details step.
   */
  const handleRegionSelect = (regionName: string, side?: string) => {
    // Red-flag suboptions bypass the normal selection flow and route straight to emergency.
    if (side && EMERGENCY_SYMPTOM_OPTIONS.includes(side)) {
      navigate("/result?emergency=true");
      return;
    }

    const symptomKey = side ? `${regionName} (${side})` : regionName;
    const alreadySelected = selectedSymptoms.some((symptom) => getSymptomKey(symptom) === symptomKey);

    if (alreadySelected) {
      const nextSymptoms = selectedSymptoms.filter((symptom) => getSymptomKey(symptom) !== symptomKey);
      setSelectedSymptoms(nextSymptoms);
      setContextSymptoms(nextSymptoms);
      return;
    }

    if (selectedSymptoms.length < MAX_SYMPTOMS) {
      const nextSymptoms = [...selectedSymptoms, { region: regionName, side }];
      setSelectedSymptoms(nextSymptoms);
      setContextSymptoms(nextSymptoms);
    }
  };

  const removeSymptom = (index: number) => {
    const nextSymptoms = selectedSymptoms.filter((_, symptomIndex) => symptomIndex !== index);
    setSelectedSymptoms(nextSymptoms);
    setContextSymptoms(nextSymptoms);
  };

  const openSymptomTextModal = () => {
    setSymptomTextDraft(symptomText);
    setSymptomTextError(null);
    setIsModalOpen(true);
  };

  const handleCloseSymptomTextModal = () => {
    stopSymptomRecording();
    cancelSymptomExtraction();
    setIsModalOpen(false);
    setSymptomTextDraft(symptomText);
    setSymptomTextError(null);
  };

  const handleContinue = () => {
    setContextSymptoms(selectedSymptoms);
    navigate("/symptom-details");
  };

  const handleClearSymptomText = () => {
    stopSymptomRecording();
    recordedTextRef.current = "";
    setSymptomText("");
    setSymptomTextDraft("");
    setSymptomTextError(null);
  };

  /**
   * Sends free-text symptoms to the extraction API and opens the details step.
   *
   * Invalid or unavailable extraction stays in the modal so users can refine the
   * same text instead of losing context by navigating away.
   */
  const handleApplySymptomText = async () => {
    stopSymptomRecording();
    const trimmedSymptomText = symptomTextDraft.trim();

    if (!trimmedSymptomText) {
      setSymptomTextError("Bitte beschreiben Sie Ihre Symptome kurz.");
      return;
    }

    if (exceedsSymptomTextLimit(trimmedSymptomText)) {
      setSymptomTextDraft(limitTextToMaxCharacters(trimmedSymptomText));
      setSymptomTextError(SYMPTOM_TEXT_CHARACTER_LIMIT_ERROR);
      return;
    }

    symptomExtractionRequestVersionRef.current += 1;
    const requestVersion = symptomExtractionRequestVersionRef.current;

    setIsExtractingSymptoms(true);
    setSymptomExtractionProgress(8);
    setSymptomTextError(null);

    clearSymptomExtractionProgressInterval();
    symptomExtractionProgressIntervalRef.current = window.setInterval(() => {
      setSymptomExtractionProgress((currentProgress) =>
        Math.min(currentProgress + Math.max(1, (92 - currentProgress) * 0.12), 92),
      );
    }, 400);

    try {
      const response = await extractSymptomsFromText(trimmedSymptomText, "text", patientData ?? undefined);

      if (symptomExtractionRequestVersionRef.current !== requestVersion) {
        return;
      }

      // Keep the user in the modal when extraction fails so they can refine the same input.
      if (response.invalidInput || response.aiUnavailable) {
        setSymptomTextError(response.message ?? "Die Beschreibung konnte nicht ausgewertet werden.");
        return;
      }

      const extractedSymptoms = getUniqueExtractedSymptoms(response.symptoms);

      if (extractedSymptoms.length === 0) {
        setSymptomTextError("Es wurden keine passenden Beschwerden erkannt. Bitte formulieren Sie die Eingabe konkreter oder wählen Sie manuell aus.");
        return;
      }

      const extractedSelection = extractedSymptoms.map(({ region, side }) => ({ region, side }));

      setSymptomText(trimmedSymptomText);
      setSelectedSymptoms(extractedSelection);
      setContextSymptoms(extractedSelection);
      setContextSymptomDetails([]);
      setSymptomExtractionProgress(100);
      setIsModalOpen(false);
      navigate("/symptom-details", { state: { extractedSymptoms } });
    } catch (error) {
      if (symptomExtractionRequestVersionRef.current === requestVersion) {
        setSymptomTextError(error instanceof Error ? error.message : "Die Beschreibung konnte nicht ausgewertet werden.");
      }
    } finally {
      if (symptomExtractionRequestVersionRef.current === requestVersion) {
        clearSymptomExtractionProgressInterval();
        setIsExtractingSymptoms(false);
        setSymptomExtractionProgress(0);
      }
    }
  };

  const renderSymptomTextButton = (className = "") => (
    <button
      type="button"
      onClick={openSymptomTextModal}
      className={`${className} w-full rounded-[16px] border-2 bg-white p-4 text-left text-app-text-body shadow-sm transition-all hover:border-[#486284] hover:bg-[#f5f7fa] ${
        symptomText.trim() ? "border-[#486284]" : "border-[#d7dee7]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-[#486284] text-app-text-on-primary">
          <Mic className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-sm"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Symptome beschreiben
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs leading-snug"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Per Freitext oder Spracheingabe schildern
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <PageShell
      title="Wo haben Sie Beschwerden?"
      subtitle="Wählen Sie einen Bereich am Körper und ergänzen Sie bis zu 3 passende Beschwerden."
      onBack={() => navigate("/medical-data")}
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5 xl:gap-6 items-start">
        <div>
          <div className="rounded-[18px] bg-[#f5f7fa] border-2 border-[#486284FF] p-4">
            <p
              className="mb-3 text-center font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-sm"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Bereich wählen
            </p>
            <AnatomyFigure selectedCategory={selectedCategory} onSelect={handleCategorySelect} />

            <div className="mt-3 grid grid-cols-1 gap-2">
              {supportingAreas.map((area) => {
                const Icon = area.icon;
                const isSelected = selectedCategory === area.id;

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => handleCategorySelect(area.id)}
                    className={`rounded-[14px] p-3 text-left transition-all ${
                      isSelected ? "bg-[#486284] text-app-text-on-primary" : "bg-white text-app-text-body hover:bg-[#dde3ea]"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full ${
                          isSelected ? "bg-white/20 text-app-text-on-primary" : "bg-[#eff2f6] text-app-text-primary"
                        }`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p
                          className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm"
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          {area.label}
                        </p>
                        <p
                          className={`font-['DM_Sans:Medium',sans-serif] font-medium text-xs leading-snug ${
                            isSelected ? "text-app-text-on-primary/85" : "text-app-text-primary"
                          }`}
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          {area.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {renderSymptomTextButton("mt-3 lg:hidden")}
        </div>

        <div>
          <div className={`mb-4 rounded-[18px] border-2 bg-[#f5f7fa] p-3 transition-all ${selectedSymptoms.length > 0 ? "border-[#486284]" : "border-transparent"}`}>
            <div className="mb-2 flex items-center justify-between">
              <p
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-sm"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Ihre Auswahl
              </p>
              <p
                className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-xs"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {selectedSymptoms.length}/{MAX_SYMPTOMS}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:grid md:grid-cols-3">
            {Array.from({ length: MAX_SYMPTOMS }).map((_, index) => {
              const symptom = selectedSymptoms[index];

              return (
                <div
                  key={index}
                  className={`min-h-0 rounded-full border px-3 py-2 md:min-h-[68px] md:rounded-[12px] md:p-3 ${
                    symptom ? "border-[#486284] bg-white text-app-text-body" : "border-dashed border-[#cfd5dd] bg-white/70 text-app-text-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 md:items-start">
                    <div>
                      <p
                        className="hidden font-['DM_Sans:Bold',sans-serif] font-bold text-xs mb-1 md:block"
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        Beschwerde {index + 1}
                      </p>
                      <p
                        className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-xs leading-tight md:text-sm"
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        {symptom ? getSymptomKey(symptom) : `${index + 1}. frei`}
                      </p>
                    </div>
                    {symptom && (
                      <button
                        type="button"
                        onClick={() => removeSymptom(index)}
                        className="rounded-full p-0.5 text-app-text-primary hover:bg-[#eff2f6]"
                        aria-label={`${getSymptomKey(symptom)} entfernen`}
                      >
                        <X className="size-3.5 md:size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>


          <div ref={symptomOptionsRef} className="scroll-mt-4" />
          {selectedCategory ? (
            <>
              <div className="mb-3">
                <p
                  className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-lg"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {selectedCategoryLabel}
                </p>
                <p
                  className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-sm"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {selectedSymptoms.length}/{MAX_SYMPTOMS} Beschwerden ausgewählt
                </p>
              </div>

              <SymptomButtonGrid
                onRegionSelect={handleRegionSelect}
                regions={filteredRegions}
                selectedRegions={selectedSymptoms.map(getSymptomKey)}
                inlineOptions={shouldShowInlineOptions}
              />
            </>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border-2 border-dashed border-[#cfd5dd] bg-[#f5f7fa] p-6 text-center">
              <p
                className="max-w-md font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-sm leading-relaxed"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Wählen Sie zuerst oben am Körper, bei Allgemein oder bei Psyche einen Bereich aus. Danach erscheinen hier die passenden Beschwerden.
              </p>
            </div>
          )}

          {renderSymptomTextButton("mt-4 hidden lg:block")}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleContinue} disabled={selectedSymptoms.length === 0}>
              <p
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Weiter
              </p>
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseSymptomTextModal}
        title="Beschreiben Sie Ihre Symptome"
        subtitle="Bitte beschreiben Sie Ihre Symptome in 1-2 Sätzen. Nennen Sie dabei Symptom, Stärke und Dauer."
        showCloseButton
      >
        <textarea
          value={symptomTextDraft}
          onBeforeInput={handleSymptomTextBeforeInput}
          onChange={(event) => handleSymptomTextChange(event.target.value)}
          onPaste={handleSymptomTextPaste}
          disabled={isExtractingSymptoms}
          maxLength={MAX_SYMPTOM_TEXT_CHARACTERS}
          placeholder="z.B. Ich habe seit 3 Tagen starke Kopfschmerzen (7/10) und leichte Übelkeit."
          className={symptomTextAreaClassName}
          style={{ fontVariationSettings: "'opsz' 14" }}
        />

        <div className="mt-2 flex justify-end">
          <span
            className={`font-['DM_Sans:Medium',sans-serif] text-xs font-medium ${
              symptomTextCharacterCount >= MAX_SYMPTOM_TEXT_CHARACTERS ? "text-red-700" : "text-app-text-muted"
            }`}
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {symptomTextCharacterCount}/{MAX_SYMPTOM_TEXT_CHARACTERS} Zeichen
          </span>
        </div>

        {symptomTextError && (
          <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {symptomTextError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 items-start">
          <div className="relative flex h-16 w-16 items-center justify-center justify-self-start">
            <VerticalProgressIconButton
              onClick={handleClearSymptomText}
              disabled={isExtractingSymptoms || symptomTextDraft.length === 0}
              className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/35"
              fillClassName="bg-red-600"
              progress={0}
              showProgress={false}
              ariaLabel="Freitext löschen"
              title="Freitext löschen"
            >
              <Trash2 className="size-8" aria-hidden="true" />
            </VerticalProgressIconButton>
            <span
              className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-24 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Löschen
            </span>
          </div>

          <div className="relative flex h-16 w-16 items-center justify-center justify-self-center">
            <VerticalProgressIconButton
              onClick={handleToggleSymptomRecording}
              disabled={isExtractingSymptoms}
              className={`text-app-text-on-primary disabled:bg-[#486284]/25 ${
                isRecordingSymptoms
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-[#486284] hover:bg-[#3a4d68]"
              }`}
              fillClassName="bg-[#486284]"
              progress={0}
              showProgress={false}
              ariaLabel={isRecordingSymptoms ? "Spracheingabe stoppen" : "Symptom diktieren"}
              ariaPressed={isRecordingSymptoms}
            >
              {isRecordingSymptoms ? (
                <MicOff className="size-8" aria-hidden="true" />
              ) : (
                <Mic className="size-8" aria-hidden="true" />
              )}
            </VerticalProgressIconButton>
            <span
              className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-48 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {isRecordingSymptoms ? `${formattedRecordingElapsed} / ${formattedMaxRecordingDuration}` : "Diktieren"}
            </span>
          </div>

          <div className="relative flex h-16 w-16 items-center justify-center justify-self-end">
            <VerticalProgressIconButton
              onClick={handleApplySymptomText}
              disabled={isExtractingSymptoms || symptomTextDraft.trim().length === 0}
              className={`${
                isExtractingSymptoms || symptomTextDraft.trim().length === 0
                  ? "bg-[#486284]/25"
                  : "bg-[#486284] hover:bg-[#3a4d68]"
              } text-app-text-on-primary`}
              fillClassName="bg-[#486284]"
              progress={actionButtonProgress}
              showProgress={false}
              ariaLabel="Symptombeschreibung übernehmen"
            >
              {isExtractingSymptoms ? (
                <span className="size-7 animate-spin rounded-full border-4 border-white/35 border-t-white" aria-hidden="true" />
              ) : (
                <Check className="size-8" strokeWidth={3} aria-hidden="true" />
              )}
            </VerticalProgressIconButton>
            <span
              className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-24 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {isExtractingSymptoms ? "Lädt..." : "Bestätigen"}
            </span>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}