import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Brain, Check, Mic, MicOff, Sparkles, X } from "lucide-react";
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
const MAX_SYMPTOM_TEXT_WORDS = 300;
const SYMPTOM_TEXT_WORD_LIMIT_ERROR = `Bitte beschreiben Sie Ihre Symptome mit maximal ${MAX_SYMPTOM_TEXT_WORDS} Wörtern.`;

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


function getWords(text: string) {
  return text.trim().match(/\S+/g) ?? [];
}

function getWordCount(text: string) {
  return getWords(text).length;
}

function formatRecordingDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getMaxSymptomWordEnd(text: string) {
  const wordMatches = Array.from(text.matchAll(/\S+/g));

  if (wordMatches.length < MAX_SYMPTOM_TEXT_WORDS) {
    return null;
  }

  const lastAllowedWord = wordMatches[MAX_SYMPTOM_TEXT_WORDS - 1];

  return (lastAllowedWord.index ?? 0) + lastAllowedWord[0].length;
}

function limitTextToMaxWords(text: string) {
  const maxSymptomWordEnd = getMaxSymptomWordEnd(text);

  if (maxSymptomWordEnd === null) {
    return text;
  }

  return text.slice(0, maxSymptomWordEnd);
}

function hasTooManySymptomTextWords(text: string) {
  return getWordCount(text) > MAX_SYMPTOM_TEXT_WORDS;
}

function hasTextAfterMaxSymptomWord(text: string) {
  const maxSymptomWordEnd = getMaxSymptomWordEnd(text);

  return maxSymptomWordEnd !== null && text.length > maxSymptomWordEnd;
}

function exceedsSymptomTextLimit(text: string) {
  return hasTooManySymptomTextWords(text) || hasTextAfterMaxSymptomWord(text);
}

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

function getTextWithPendingTextAreaInput(event: FormEvent<HTMLTextAreaElement>, inputText: string) {
  const { selectionEnd, selectionStart, value } = event.currentTarget;

  return insertTextAtSelection(value, inputText, selectionStart, selectionEnd);
}

function getTextWithPendingTextAreaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
  const { selectionEnd, selectionStart, value } = event.currentTarget;
  const pastedText = event.clipboardData.getData("text");

  return insertTextAtSelection(value, pastedText, selectionStart, selectionEnd);
}

function getSymptomKey(symptom: SelectedSymptom) {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
}

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

function isBodyAreaCategory(value: string | null): value is BodyAreaCategory {
  return Boolean(value && value in BODY_AREA_REGION_IDS);
}

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
      className="mx-auto h-[330px] w-[210px] md:h-[390px] md:w-[245px]"
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

      <path d="M96 74 C99 84 121 84 124 74 L124 91 C118 96 102 96 96 91 Z" fill="#dfe5ec" />

      <g
        role="button"
        tabIndex={0}
        aria-label="Kopf auswählen"
        aria-pressed={selectedCategory === "head"}
        onClick={() => onSelect("head")}
        onKeyDown={activate("head")}
        className={interactiveClass}
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
    setSymptomDetails: setContextSymptomDetails,
  } = useAssessment();
  const [selectedCategory, setSelectedCategory] = useState<BodyAreaCategory | null>(initialCategory);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>(contextSymptoms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symptomText, setSymptomText] = useState("");
  const [isExtractingSymptoms, setIsExtractingSymptoms] = useState(false);
  const [isRecordingSymptoms, setIsRecordingSymptoms] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [symptomTextError, setSymptomTextError] = useState<string | null>(null);
  const symptomOptionsRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingTimerIntervalRef = useRef<number | null>(null);
  const recordedTextRef = useRef("");

  const selectedCategoryLabel = selectedCategory ? BODY_AREA_LABELS[selectedCategory] : "";
  const filteredRegions = useMemo(() => getBodyRegionsForCategory(selectedCategory), [selectedCategory]);
  const shouldShowInlineOptions = selectedCategory !== "torso";
  const symptomTextWordCount = useMemo(() => getWordCount(symptomText), [symptomText]);
  const formattedRecordingElapsed = formatRecordingDuration(recordingElapsedSeconds);
  const formattedMaxRecordingDuration = formatRecordingDuration(MAX_RECORDING_DURATION_SECONDS);

  const handleSymptomTextChange = (text: string) => {
    if (exceedsSymptomTextLimit(text)) {
      setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
      return;
    }

    setSymptomText(text);

    if (symptomTextError === SYMPTOM_TEXT_WORD_LIMIT_ERROR) {
      setSymptomTextError(null);
    }
  };

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
      setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
    }
  };

  const handleSymptomTextPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const nextText = getTextWithPendingTextAreaPaste(event);

    if (exceedsSymptomTextLimit(nextText)) {
      event.preventDefault();
      setSymptomText(limitTextToMaxWords(nextText));
      setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
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
      return limitTextToMaxWords(normalizedBaseText);
    }

    const combinedTranscript = normalizedBaseText ? `${normalizedBaseText} ${normalizedTranscript}` : normalizedTranscript;

    return limitTextToMaxWords(combinedTranscript);
  };

  const handleToggleSymptomRecording = () => {
    if (isRecordingSymptoms) {
      stopSymptomRecording();
      return;
    }

    if (symptomTextWordCount >= MAX_SYMPTOM_TEXT_WORDS) {
      setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSymptomTextError("Spracheingabe wird von diesem Browser nicht unterstützt. Bitte nutzen Sie den Freitext.");
      return;
    }

    const recognition = new SpeechRecognition();
    recordedTextRef.current = symptomText.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "de-DE";

    recognition.onstart = () => {
      setIsRecordingSymptoms(true);
      startRecordingTimer();
      setSymptomTextError(null);
    };

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
      setSymptomText(nextSymptomText);

      if (getWordCount(nextSymptomText) >= MAX_SYMPTOM_TEXT_WORDS && (finalTranscript || interimTranscript)) {
        setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
        stopSymptomRecording();
      }
    };

    recognition.onerror = (event) => {
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

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      clearRecordingTimerInterval();
      speechRecognitionRef.current?.abort();
    };
  }, []);

  const handleCategorySelect = (category: BodyAreaCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSearchParams({});
      return;
    }

    setSelectedCategory(category);
    setSearchParams({ category });

    if (window.innerWidth < 768) {
      window.setTimeout(() => {
        symptomOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const handleRegionSelect = (regionName: string, side?: string) => {
    if (side && EMERGENCY_SYMPTOM_OPTIONS.includes(side)) {
      navigate("/result?emergency=true");
      return;
    }

    const symptomKey = side ? `${regionName} (${side})` : regionName;
    const alreadySelected = selectedSymptoms.some((symptom) => getSymptomKey(symptom) === symptomKey);

    if (alreadySelected) {
      setSelectedSymptoms((symptoms) => symptoms.filter((symptom) => getSymptomKey(symptom) !== symptomKey));
      return;
    }

    if (selectedSymptoms.length < MAX_SYMPTOMS) {
      setSelectedSymptoms([...selectedSymptoms, { region: regionName, side }]);
    }
  };

  const removeSymptom = (index: number) => {
    setSelectedSymptoms(selectedSymptoms.filter((_, symptomIndex) => symptomIndex !== index));
  };

  const handleContinue = () => {
    setContextSymptoms(selectedSymptoms);
    setContextSymptomDetails([]);
    navigate("/symptom-details");
  };

  const handleApplySymptomText = async () => {
    stopSymptomRecording();
    const trimmedSymptomText = symptomText.trim();

    if (!trimmedSymptomText) {
      setSymptomTextError("Bitte beschreiben Sie Ihre Symptome kurz.");
      return;
    }

    if (exceedsSymptomTextLimit(trimmedSymptomText)) {
      setSymptomText(limitTextToMaxWords(trimmedSymptomText));
      setSymptomTextError(SYMPTOM_TEXT_WORD_LIMIT_ERROR);
      return;
    }

    setIsExtractingSymptoms(true);
    setSymptomTextError(null);

    try {
      const response = await extractSymptomsFromText(trimmedSymptomText);

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

      setSelectedSymptoms(extractedSelection);
      setContextSymptoms(extractedSelection);
      setContextSymptomDetails([]);
      setIsModalOpen(false);
      setSymptomText("");
      navigate("/symptom-details", { state: { extractedSymptoms } });
    } catch (error) {
      setSymptomTextError(error instanceof Error ? error.message : "Die Beschreibung konnte nicht ausgewertet werden.");
    } finally {
      setIsExtractingSymptoms(false);
    }
  };

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

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-3 w-full rounded-[16px] border border-[#d7dee7] bg-white p-4 text-left text-app-text-body shadow-sm transition-all hover:border-[#486284] hover:bg-[#f5f7fa]"
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
        </div>

        <div>
          <div className="mb-4 rounded-[18px] bg-[#f5f7fa] p-3">
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
        onClose={() => {
          stopSymptomRecording();
          setIsModalOpen(false);
          setSymptomText("");
          setSymptomTextError(null);
        }}
        title="Beschreiben Sie Ihre Symptome"
        subtitle="Bitte beschreiben Sie Ihre Symptome in 1-2 Sätzen. Nennen Sie dabei Symptom, Stärke und Dauer."
        showCloseButton
      >
        <textarea
          value={symptomText}
          onBeforeInput={handleSymptomTextBeforeInput}
          onChange={(event) => handleSymptomTextChange(event.target.value)}
          onPaste={handleSymptomTextPaste}
          placeholder="z.B. Ich habe seit 3 Tagen starke Kopfschmerzen (7/10) und leichte Übelkeit."
          className="w-full h-40 bg-[#eff2f6] rounded-[16px] p-4 resize-none border-none outline-none focus:ring-2 focus:ring-[#486284] font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-base"
          style={{ fontVariationSettings: "'opsz' 14" }}
        />

        <div className="mt-2 flex justify-end">
          <span
            className={`font-['DM_Sans:Medium',sans-serif] text-xs font-medium ${
              symptomTextWordCount >= MAX_SYMPTOM_TEXT_WORDS ? "text-red-700" : "text-app-text-muted"
            }`}
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {symptomTextWordCount}/{MAX_SYMPTOM_TEXT_WORDS} Wörter
          </span>
        </div>

        {symptomTextError && (
          <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {symptomTextError}
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <div className="flex w-16 flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSymptomRecording}
              disabled={isExtractingSymptoms}
              className={`text-app-text-on-primary rounded-full w-16 h-16 transition-all shadow-lg flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60 ${
                isRecordingSymptoms ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-[#486284] hover:bg-[#3a4d68]"
              }`}
              aria-label={isRecordingSymptoms ? "Spracheingabe stoppen" : "Symptom diktieren"}
              aria-pressed={isRecordingSymptoms}
            >
              {isRecordingSymptoms ? (
                <MicOff className="size-8" aria-hidden="true" />
              ) : (
                <Mic className="size-8" aria-hidden="true" />
              )}
            </button>
            <span
              className="min-h-4 w-48 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {isRecordingSymptoms ? `${formattedRecordingElapsed} / ${formattedMaxRecordingDuration}` : "Diktieren"}
            </span>
          </div>

          <button
            onClick={handleApplySymptomText}
            disabled={isExtractingSymptoms || symptomText.trim().length === 0}
            className="bg-[#486284] text-app-text-on-primary rounded-full w-16 h-16 hover:bg-[#3a4d68] transition-all shadow-lg flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Symptombeschreibung übernehmen"
          >
            {isExtractingSymptoms ? (
              <span className="size-7 animate-spin rounded-full border-4 border-white/35 border-t-white" aria-hidden="true" />
            ) : (
              <Check className="size-8" strokeWidth={3} aria-hidden="true" />
            )}
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}