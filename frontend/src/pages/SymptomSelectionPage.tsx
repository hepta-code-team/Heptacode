import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Brain, Check, Mic, MicOff, PersonStanding, Sparkles, Trash2, X } from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import { useAssessment } from "../lib/AssessmentContext";
import { extractSymptomsFromText } from "../lib/symptomExtractionApi";
import {
  BODY_AREA_LABELS,
  BODY_AREA_REGION_IDS,
  BODY_REGIONS,
  EMERGENCY_SYMPTOM_OPTIONS,
  getBodyRegionsForCategory,
  MAX_SYMPTOMS,
  type BodyAreaCategory,
} from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom } from "../../../shared/symptom.types";
import type { TriageSymptom } from "../../../shared/symptom.types";


const MAX_RECORDING_DURATION_MS = 60_000;
const MAX_RECORDING_DURATION_SECONDS = MAX_RECORDING_DURATION_MS / 1000;
const MAX_SYMPTOM_TEXT_CHARACTERS = 300;
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
type SymptomInputMode = "body" | "freeText";

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

type BodySide = "Links" | "Rechts";
type SideAwareBodyAreaCategory = Extract<BodyAreaCategory, "arms" | "legs">;
type BodySideSelection = {
  category: SideAwareBodyAreaCategory;
  side: BodySide;
};
type HoveredBodyArea = {
  category: BodyAreaCategory;
  side?: BodySide;
};

const BODY_SIDE_LABELS: Record<BodySide, string> = {
  Links: "Linke Körperseite",
  Rechts: "Rechte Körperseite",
};

const BODY_SIDE_TITLE_LABELS: Record<BodySide, string> = {
  Links: "links",
  Rechts: "rechts",
};

function isBodySide(value: string | null): value is BodySide {
  return value === "Links" || value === "Rechts";
}

function isSideAwareCategory(category: BodyAreaCategory | null): category is SideAwareBodyAreaCategory {
  return category === "arms" || category === "legs";
}

function formatSelectedCategoryLabel(category: BodyAreaCategory | null, selectedBodySide: BodySideSelection | null) {
  if (!category) {
    return "";
  }

  if (selectedBodySide?.category === "arms" && category === "arms") {
    return `Arm ${BODY_SIDE_TITLE_LABELS[selectedBodySide.side]}`;
  }

  if (selectedBodySide?.category === "legs" && category === "legs") {
    return `Bein ${BODY_SIDE_TITLE_LABELS[selectedBodySide.side]}`;
  }

  return BODY_AREA_LABELS[category];
}

/**
 * Maps a selected symptom back to the body-area tab that can show it again.
 *
 * This keeps filled selection slots useful after click, because users return to
 * the same category instead of only seeing a static summary chip.
 */
function getBodyAreaCategoryForSymptom(symptom: SelectedSymptom): BodyAreaCategory | null {
  const matchingRegion = BODY_REGIONS.find((region) => region.name === symptom.region);

  if (!matchingRegion) {
    return null;
  }

  const preferredCategories: BodyAreaCategory[] = ["head", "neck", "torso", "hips", "arms", "legs", "mental", "general"];

  return preferredCategories.find((category) => BODY_AREA_REGION_IDS[category].includes(matchingRegion.id)) ?? null;
}

/**
 * Restores the selected body side when a slot contains an arm or leg symptom.
 */
function getBodySideSelectionForSymptom(
  category: BodyAreaCategory | null,
  symptom: SelectedSymptom,
): BodySideSelection | null {
  if (!category || !isSideAwareCategory(category) || !symptom.side) {
    return null;
  }

  if (symptom.side.startsWith("Links")) {
    return { category, side: "Links" };
  }

  if (symptom.side.startsWith("Rechts")) {
    return { category, side: "Rechts" };
  }

  return null;
}

/**
 * Interactive body selector used for coarse symptom localization.
 *
 * The SVG uses keyboard handlers and button-like roles so body-region selection
 * remains available beyond pointer-only interactions.
 */
function AnatomyFigure({
  selectedCategory,
  selectedBodySide,
  onSelect,
}: {
  selectedCategory: BodyAreaCategory | null;
  selectedBodySide: BodySideSelection | null;
  onSelect: (category: BodyAreaCategory, side?: BodySide) => void;
}) {
  const [hoveredBodyArea, setHoveredBodyArea] = useState<HoveredBodyArea | null>(null);
  const isPartMarked = (category: BodyAreaCategory) =>
    selectedCategory === category || hoveredBodyArea?.category === category;
  const partFill = (category: BodyAreaCategory) => isPartMarked(category) ? "#486284" : "#ffffff";
  const partStroke = (category: BodyAreaCategory) => isPartMarked(category) ? "#486284" : "#d7dee7";
  const labelFill = (category: BodyAreaCategory) => isPartMarked(category) ? "#ffffff" : "#486284";
  const isSideSelected = (category: SideAwareBodyAreaCategory, side: BodySide) => {
    if (selectedCategory !== category) {
      return false;
    }

    return selectedBodySide?.category === category ? selectedBodySide.side === side : true;
  };
  const isSideMarked = (category: SideAwareBodyAreaCategory, side: BodySide) => {
    if (isSideSelected(category, side)) {
      return true;
    }

    return hoveredBodyArea?.category === category && hoveredBodyArea.side === side;
  };
  const sidePartFill = (category: SideAwareBodyAreaCategory, side: BodySide) =>
    isSideMarked(category, side) ? "#486284" : "#ffffff";
  const sidePartStroke = (category: SideAwareBodyAreaCategory, side: BodySide) =>
    isSideMarked(category, side) ? "#486284" : "#d7dee7";
  const sideLabelFill = (category: SideAwareBodyAreaCategory, side: BodySide) =>
    isSideMarked(category, side) ? "#ffffff" : "#486284";

  const activate = (category: BodyAreaCategory) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(category);
    }
  };
  const activateSide = (category: SideAwareBodyAreaCategory, side: BodySide) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(category, side);
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

      <g>
        <g
          role="button"
          tabIndex={0}
          aria-label="Rechten Arm auswählen"
          aria-pressed={isSideSelected("arms", "Rechts")}
          onClick={() => onSelect("arms", "Rechts")}
          onKeyDown={activateSide("arms", "Rechts")}
          onMouseEnter={() => setHoveredBodyArea({ category: "arms", side: "Rechts" })}
          onMouseLeave={() => setHoveredBodyArea(null)}
          onFocus={() => setHoveredBodyArea({ category: "arms", side: "Rechts" })}
          onBlur={() => setHoveredBodyArea(null)}
          className={interactiveClass}
        >
          <path
            d="M55 103 C47 109 43 119 42 132 L37 203 C36 218 43 228 54 228 C65 228 70 219 70 205 L75 135 C76 121 81 109 90 102 L90 93 Z"
            fill={sidePartFill("arms", "Rechts")}
            stroke={sidePartStroke("arms", "Rechts")}
            strokeWidth="4"
            filter="url(#body-shadow)"
          />
          <text x="54" y="168" textAnchor="middle" fill={sideLabelFill("arms", "Rechts")} fontSize="11" fontWeight="700" transform="rotate(-86 54 168)">Arm (R)</text>
        </g>

        <g
          role="button"
          tabIndex={0}
          aria-label="Linken Arm auswählen"
          aria-pressed={isSideSelected("arms", "Links")}
          onClick={() => onSelect("arms", "Links")}
          onKeyDown={activateSide("arms", "Links")}
          onMouseEnter={() => setHoveredBodyArea({ category: "arms", side: "Links" })}
          onMouseLeave={() => setHoveredBodyArea(null)}
          onFocus={() => setHoveredBodyArea({ category: "arms", side: "Links" })}
          onBlur={() => setHoveredBodyArea(null)}
          className={interactiveClass}
        >
          <path
            d="M165 103 C173 109 177 119 178 132 L183 203 C184 218 177 228 166 228 C155 228 150 219 150 205 L145 135 C144 121 139 109 130 102 L130 93 Z"
            fill={sidePartFill("arms", "Links")}
            stroke={sidePartStroke("arms", "Links")}
            strokeWidth="4"
            filter="url(#body-shadow)"
          />
          <text x="166" y="168" textAnchor="middle" fill={sideLabelFill("arms", "Links")} fontSize="11" fontWeight="700" transform="rotate(86 166 168)">Arm (L)</text>
        </g>
      </g>

      <g>
        <g
          role="button"
          tabIndex={0}
          aria-label="Rechtes Bein auswählen"
          aria-pressed={isSideSelected("legs", "Rechts")}
          onClick={() => onSelect("legs", "Rechts")}
          onKeyDown={activateSide("legs", "Rechts")}
          onMouseEnter={() => setHoveredBodyArea({ category: "legs", side: "Rechts" })}
          onMouseLeave={() => setHoveredBodyArea(null)}
          onFocus={() => setHoveredBodyArea({ category: "legs", side: "Rechts" })}
          onBlur={() => setHoveredBodyArea(null)}
          className={interactiveClass}
        >
          <path
            d="M66 217 H104 L101 318 C101 333 92 343 80 343 C68 343 61 333 62 318 Z"
            fill={sidePartFill("legs", "Rechts")}
            stroke={sidePartStroke("legs", "Rechts")}
            strokeWidth="4"
            filter="url(#body-shadow)"
          />
          <text x="82" y="282" textAnchor="middle" fill={sideLabelFill("legs", "Rechts")} fontSize="11" fontWeight="700" transform="rotate(-90 82 282)">Bein (R)</text>
        </g>

        <g
          role="button"
          tabIndex={0}
          aria-label="Linkes Bein auswählen"
          aria-pressed={isSideSelected("legs", "Links")}
          onClick={() => onSelect("legs", "Links")}
          onKeyDown={activateSide("legs", "Links")}
          onMouseEnter={() => setHoveredBodyArea({ category: "legs", side: "Links" })}
          onMouseLeave={() => setHoveredBodyArea(null)}
          onFocus={() => setHoveredBodyArea({ category: "legs", side: "Links" })}
          onBlur={() => setHoveredBodyArea(null)}
          className={interactiveClass}
        >
          <path
            d="M116 217 H154 L158 318 C159 333 152 343 140 343 C128 343 119 333 119 318 Z"
            fill={sidePartFill("legs", "Links")}
            stroke={sidePartStroke("legs", "Links")}
            strokeWidth="4"
            filter="url(#body-shadow)"
          />
          <text x="138" y="282" textAnchor="middle" fill={sideLabelFill("legs", "Links")} fontSize="11" fontWeight="700" transform="rotate(90 138 282)">Bein (L)</text>
        </g>
      </g>

      <g
        role="button"
        tabIndex={0}
        aria-label="Torso auswählen"
        aria-pressed={selectedCategory === "torso"}
        onClick={() => onSelect("torso")}
        onKeyDown={activate("torso")}
        onMouseEnter={() => setHoveredBodyArea({ category: "torso" })}
        onMouseLeave={() => setHoveredBodyArea(null)}
        onFocus={() => setHoveredBodyArea({ category: "torso" })}
        onBlur={() => setHoveredBodyArea(null)}
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
        onMouseEnter={() => setHoveredBodyArea({ category: "hips" })}
        onMouseLeave={() => setHoveredBodyArea(null)}
        onFocus={() => setHoveredBodyArea({ category: "hips" })}
        onBlur={() => setHoveredBodyArea(null)}
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
        onMouseEnter={() => setHoveredBodyArea({ category: "headNeck" })}
        onMouseLeave={() => setHoveredBodyArea(null)}
        onFocus={() => setHoveredBodyArea({ category: "headNeck" })}
        onBlur={() => setHoveredBodyArea(null)}
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
        onMouseEnter={() => setHoveredBodyArea({ category: "neck" })}
        onMouseLeave={() => setHoveredBodyArea(null)}
        onFocus={() => setHoveredBodyArea({ category: "neck" })}
        onBlur={() => setHoveredBodyArea(null)}
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
        onMouseEnter={() => setHoveredBodyArea({ category: "head" })}
        onMouseLeave={() => setHoveredBodyArea(null)}
        onFocus={() => setHoveredBodyArea({ category: "head" })}
        onBlur={() => setHoveredBodyArea(null)}
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
  const initialSide = searchParams.get("side");
  const initialBodySide: BodySideSelection | null =
    isSideAwareCategory(initialCategory) && isBodySide(initialSide)
      ? { category: initialCategory, side: initialSide }
      : null;
  const {
    selectedSymptoms: contextSymptoms,
    setSelectedSymptoms: setContextSymptoms,
    patientData,
    symptomText,
    setSymptomText,
    symptomDetails: contextSymptomDetails,
    setSymptomDetails: setContextSymptomDetails,
  } = useAssessment();
  const [selectedCategory, setSelectedCategory] = useState<BodyAreaCategory | null>(initialCategory);
  const [selectedBodySide, setSelectedBodySide] = useState<BodySideSelection | null>(initialBodySide);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>(contextSymptoms);
  const [activeSelectionSlotIndex, setActiveSelectionSlotIndex] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<SymptomInputMode>(symptomText.trim() && contextSymptoms.length === 0 ? "freeText" : "body");
  const [symptomTextDraft, setSymptomTextDraft] = useState(symptomText);
  const [isExtractingSymptoms, setIsExtractingSymptoms] = useState(false);
  const [, setSymptomExtractionProgress] = useState(0);
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

  const selectedCategoryLabel = formatSelectedCategoryLabel(selectedCategory, selectedBodySide);
  const filteredRegions = useMemo(() => getBodyRegionsForCategory(selectedCategory), [selectedCategory]);
  const selectedRegionKeys = useMemo(() => selectedSymptoms.map(getSymptomKey), [selectedSymptoms]);
  const selectedRegionKeysForGrid = useMemo(() => {
    if (!selectedBodySide || selectedBodySide.category !== selectedCategory) {
      return selectedRegionKeys;
    }

    return selectedRegionKeys.filter((symptomKey) => symptomKey.includes(`(${selectedBodySide.side}`));
  }, [selectedBodySide, selectedCategory, selectedRegionKeys]);
  const shouldShowInlineOptions = false;
  const symptomTextCharacterCount = useMemo(() => getCharacterCount(symptomTextDraft), [symptomTextDraft]);
  const formattedRecordingElapsed = formatRecordingDuration(recordingElapsedSeconds);
  const formattedMaxRecordingDuration = formatRecordingDuration(MAX_RECORDING_DURATION_SECONDS);
  const isBodyMode = inputMode === "body";
  const isFreeTextMode = inputMode === "freeText";
  const symptomTextAreaClassName = `w-full h-36 bg-[#eff2f6] rounded-[16px] p-4 resize-none border-none outline-none font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-base disabled:cursor-not-allowed disabled:text-app-text-muted ${
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
    if (!isFreeTextMode) {
      setInputMode("freeText");
    }

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
   * Keeps the local button state in sync with symptoms changed on the detail page.
   */
  useEffect(() => {
    setSelectedSymptoms(contextSymptoms);
    setActiveSelectionSlotIndex((currentIndex) =>
      currentIndex !== null && currentIndex >= contextSymptoms.length ? null : currentIndex,
    );
  }, [contextSymptoms]);

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
  const handleCategorySelect = (category: BodyAreaCategory, side?: BodySide) => {
    if (!isBodyMode) {
      setInputMode("body");
      return;
    }

    const nextBodySide: BodySideSelection | null =
      isSideAwareCategory(category) && side ? { category, side } : null;
    const isSameBodySide =
      selectedBodySide?.category === nextBodySide?.category && selectedBodySide?.side === nextBodySide?.side;

    if (selectedCategory === category && (!nextBodySide || isSameBodySide)) {
      setSelectedCategory(null);
      setSelectedBodySide(null);
      setSearchParams({});
      return;
    }

    setSelectedCategory(category);
    setSelectedBodySide(nextBodySide);
    setSearchParams(nextBodySide ? { category, side: nextBodySide.side } : { category });

    // On mobile, move the newly opened options into view after React has rendered them.
    if (window.innerWidth < 768) {
      window.setTimeout(() => {
        symptomOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  /**
   * Keeps automatic scrolling mobile-only.
   *
   * Desktop users can already see the options next to the body figure, while
   * mobile users need the viewport moved after a category or slot click.
   */
  const scrollToSymptomOptions = () => {
    if (window.innerWidth >= 768) {
      return;
    }

    window.setTimeout(() => {
      symptomOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  /**
   * Turns the three selection cards into real symptom slots.
   *
   * Empty slots guide users to add another symptom; filled slots reopen the
   * related category so the existing choice is visible in context.
   */
  const focusSelectionSlot = (index: number) => {
    setInputMode("body");
    setActiveSelectionSlotIndex(index);

    const symptom = selectedSymptoms[index];

    if (!symptom) {
      scrollToSymptomOptions();
      return;
    }

    const category = getBodyAreaCategoryForSymptom(symptom);
    const bodySide = getBodySideSelectionForSymptom(category, symptom);

    if (category) {
      setSelectedCategory(category);
      setSelectedBodySide(bodySide);
      setSearchParams(bodySide ? { category, side: bodySide.side } : { category });
    }

    scrollToSymptomOptions();
  };

  /**
   * Gives clickable symptom slots the same keyboard behavior as buttons.
   */
  const handleSelectionSlotKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusSelectionSlot(index);
    }
  };

  /**
   * Adds or removes a specific symptom selection.
   * Emergency suboptions short-circuit into the emergency result, while normal
   * symptoms are capped to the maximum count supported by the details step.
   */
  const handleRegionSelect = (regionName: string, side?: string) => {
    if (!isBodyMode) {
      setInputMode("body");
      return;
    }

    // Red-flag suboptions bypass the normal selection flow and route straight to emergency.
    if (side && EMERGENCY_SYMPTOM_OPTIONS.includes(side)) {
      const params = new URLSearchParams({
        emergency: "true",
        acuteSymptom: side,
        acuteSymptomDescription:
          "Dieses Warnsymptom kann auf einen medizinischen Notfall hinweisen und sollte sofort abgeklärt werden.",
      });

      navigate(`/result?${params.toString()}`);
      return;
    }

    const bodySide = selectedBodySide?.category === selectedCategory ? selectedBodySide.side : undefined;
    const localizedSide = bodySide ? (side && side !== regionName ? `${bodySide}: ${side}` : bodySide) : side;
    const symptomKey = localizedSide ? `${regionName} (${localizedSide})` : regionName;
    const alreadySelected = selectedSymptoms.some((symptom) => getSymptomKey(symptom) === symptomKey);

    if (alreadySelected) {
      const nextSymptoms = selectedSymptoms.filter((symptom) => getSymptomKey(symptom) !== symptomKey);
      setSelectedSymptoms(nextSymptoms);
      setContextSymptoms(nextSymptoms);
      setActiveSelectionSlotIndex((currentIndex) =>
        currentIndex !== null && currentIndex >= nextSymptoms.length ? null : currentIndex,
      );
      setContextSymptomDetails(
        contextSymptomDetails.filter((symptom) => getSymptomKey(symptom) !== symptomKey),
      );
      return;
    }

    if (selectedSymptoms.length < MAX_SYMPTOMS) {
      const nextSymptoms = [...selectedSymptoms, { region: regionName, side: localizedSide }];
      setSelectedSymptoms(nextSymptoms);
      setContextSymptoms(nextSymptoms);
      setActiveSelectionSlotIndex(nextSymptoms.length - 1);
    }
  };

  const removeSymptom = (index: number) => {
    const removedSymptom = selectedSymptoms[index];
    const nextSymptoms = selectedSymptoms.filter((_, symptomIndex) => symptomIndex !== index);
    setSelectedSymptoms(nextSymptoms);
    setContextSymptoms(nextSymptoms);
    setActiveSelectionSlotIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === index) {
        return null;
      }

      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });

    if (removedSymptom) {
      const removedSymptomKey = getSymptomKey(removedSymptom);
      setContextSymptomDetails(
        contextSymptomDetails.filter((symptom) => getSymptomKey(symptom) !== removedSymptomKey),
      );
    }
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
   * Invalid or unavailable extraction stays on the same tab so users can refine
   * the same text instead of losing context by navigating away.
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

      const extractedSelection = extractedSymptoms.map(({ region, side }) => ({ region, side })).slice(0, MAX_SYMPTOMS);
      const extractedSelectionKeys = new Set(extractedSelection.map(getSymptomKey));
      const extractedSymptomsForDetails = extractedSymptoms.filter((symptom) =>
        extractedSelectionKeys.has(getSymptomKey(symptom)),
      );

      setSymptomText(trimmedSymptomText);
      setSelectedSymptoms(extractedSelection);
      setContextSymptoms(extractedSelection);
      setContextSymptomDetails(
        contextSymptomDetails.filter((symptom) => extractedSelectionKeys.has(getSymptomKey(symptom))),
      );
      setSymptomExtractionProgress(100);
      navigate("/symptom-details", { state: { extractedSymptoms: extractedSymptomsForDetails } });
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

  return (
    <PageShell
      title="Wie möchten Sie Ihre Beschwerden angeben?"
      subtitle="Wählen Sie entweder einen Körperbereich aus oder beschreiben Sie Ihre Symptome über die Freitext- und Spracheingabe."
      onBack={() => navigate("/pre-existing-conditions")}
    >
      <div className="mb-5 rounded-[20px] border border-[#d7dee7] bg-[#f5f7fa] p-2 shadow-sm">
        {/* The segmented tabs make the two mutually exclusive input modes explicit. */}
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Eingabemodus wählen">
          <button
            type="button"
            role="tab"
            aria-selected={isBodyMode}
            onClick={() => setInputMode("body")}
            className={`rounded-[16px] px-4 py-3 text-left transition-all ${
              isBodyMode ? "bg-white text-app-text-primary shadow-md" : "text-app-text-muted hover:bg-white/60"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full ${
                  isBodyMode ? "bg-[#486284] text-app-text-on-primary" : "bg-white text-app-text-primary"
                }`}
              >
                <PersonStanding className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span
                  className="block font-['DM_Sans:Bold',sans-serif] text-sm font-bold"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Körperstelle auswählen
                </span>
                <span
                  className="mt-0.5 hidden font-['DM_Sans:Medium',sans-serif] text-xs font-medium sm:block"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Für klare lokale Beschwerden
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={isFreeTextMode}
            onClick={() => setInputMode("freeText")}
            className={`rounded-[16px] px-4 py-3 text-left transition-all ${
              isFreeTextMode ? "bg-white text-app-text-primary shadow-md" : "text-app-text-muted hover:bg-white/60"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full ${
                  isFreeTextMode ? "bg-[#486284] text-app-text-on-primary" : "bg-white text-app-text-primary"
                }`}
              >
                <Mic className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span
                  className="block font-['DM_Sans:Bold',sans-serif] text-sm font-bold"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Frei beschreiben
                </span>
                <span
                  className="mt-0.5 hidden font-['DM_Sans:Medium',sans-serif] text-xs font-medium sm:block"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Für Sprache oder eigene Worte
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {isBodyMode ? (
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:gap-6">
          <section className="rounded-[20px] border-2 border-[#486284] bg-[#f5f7fa] p-4 shadow-md">
            <p
              className="mb-3 text-center font-['DM_Sans:Bold',sans-serif] text-sm font-bold text-app-text-primary"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Bereich wählen
            </p>
            <AnatomyFigure
              selectedCategory={selectedCategory}
              selectedBodySide={selectedBodySide}
              onSelect={handleCategorySelect}
            />

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
                          className="font-['DM_Sans:Bold',sans-serif] text-sm font-bold"
                          style={{ fontVariationSettings: "'opsz' 14" }}
                        >
                          {area.label}
                        </p>
                        <p
                          className={`font-['DM_Sans:Medium',sans-serif] text-xs font-medium leading-snug ${
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
          </section>

          <section className="">
            <div className={`mb-4 rounded-[18px] border-2 bg-[#f5f7fa] p-3 transition-all ${selectedSymptoms.length > 0 ? "border-[#486284]" : "border-transparent"}`}>
              <div className="mb-2 flex items-center justify-between">
                <p
                  className="font-['DM_Sans:Bold',sans-serif] text-sm font-bold text-app-text-primary"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Ihre Auswahl
                </p>
                <p
                  className="font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {selectedSymptoms.length}/{MAX_SYMPTOMS}
                </p>
              </div>
              {/* Selection slots are interactive so users can add or revisit up to three symptoms. */}
              <div className="flex flex-wrap gap-2 md:grid md:grid-cols-3">
                {Array.from({ length: MAX_SYMPTOMS }).map((_, index) => {
                  const symptom = selectedSymptoms[index];
                  const isActiveSlot = activeSelectionSlotIndex === index;

                  return (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={() => focusSelectionSlot(index)}
                      onKeyDown={(event) => handleSelectionSlotKeyDown(event, index)}
                      className={`min-h-0 cursor-pointer rounded-full border px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#486284] md:min-h-[68px] md:rounded-[12px] md:p-3 ${
                        symptom ? "border-[#486284] bg-white text-app-text-body hover:bg-[#eff2f6]" : "border-dashed border-[#cfd5dd] bg-white/70 text-app-text-muted hover:border-[#486284] hover:bg-white"
                      } ${isActiveSlot ? "ring-2 ring-[#486284] ring-offset-2" : ""}`}
                      aria-label={
                        symptom
                          ? `${getSymptomKey(symptom)} anzeigen`
                          : `Beschwerde ${index + 1} hinzufügen`
                      }
                    >
                      <div className="flex items-center justify-between gap-2 md:items-start">
                        <div>
                          <p
                            className="hidden font-['DM_Sans:Bold',sans-serif] text-xs font-bold md:mb-1 md:block"
                            style={{ fontVariationSettings: "'opsz' 14" }}
                          >
                            Beschwerde {index + 1}
                          </p>
                          <p
                            className="font-['DM_Sans:SemiBold',sans-serif] text-xs font-semibold leading-tight md:text-sm"
                            style={{ fontVariationSettings: "'opsz' 14" }}
                          >
                            {symptom ? getSymptomKey(symptom) : `${index + 1}. hinzufügen`}
                          </p>
                        </div>
                        {symptom && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeSymptom(index);
                            }}
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
                    className="font-['DM_Sans:Bold',sans-serif] text-lg font-bold text-app-text-primary"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {selectedCategoryLabel}
                  </p>
                  <p
                    className="font-['DM_Sans:Medium',sans-serif] text-sm font-medium text-app-text-primary"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    Wählen Sie bis zu {MAX_SYMPTOMS} passende Beschwerden aus.
                  </p>
                  {selectedBodySide && selectedBodySide.category === selectedCategory && (
                    <p
                      className="font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-muted"
                      style={{ fontVariationSettings: "'opsz' 14" }}
                    >
                      {BODY_SIDE_LABELS[selectedBodySide.side]}
                    </p>
                  )}
                </div>

                <SymptomButtonGrid
                  onRegionSelect={handleRegionSelect}
                  regions={filteredRegions}
                  selectedRegions={selectedRegionKeysForGrid}
                  inlineOptions={shouldShowInlineOptions}
                />
              </>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border-2 border-dashed border-[#cfd5dd] bg-[#f5f7fa] p-6 text-center">
                <p
                  className="max-w-md font-['DM_Sans:Medium',sans-serif] text-sm font-medium leading-relaxed text-app-text-primary"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Wählen Sie zuerst einen Körperbereich aus. Danach erscheinen hier die passenden Beschwerden und Bereiche.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleContinue} disabled={selectedSymptoms.length === 0}>
                <p
                  className="font-['DM_Sans:Bold',sans-serif] text-base font-bold"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  Weiter
                </p>
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <section className="w-full min-w-0 rounded-[20px] border border-[#d7dee7] bg-white p-5 pb-10 shadow-md">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-[#486284] text-app-text-on-primary shadow-md">
              <Mic className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p
                className="font-['DM_Sans:Bold',sans-serif] text-lg font-bold text-app-text-primary"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Beschwerden frei beschreiben
              </p>
              <p
                className="mt-1 font-['DM_Sans:Medium',sans-serif] text-sm font-medium leading-relaxed text-app-text-muted"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Bitte beschreiben Sie Ihre Symptome in 1-2 Sätzen. Nennen Sie dabei Symptom, Stärke und Dauer.              </p>
            </div>
          </div>

          <textarea
            value={symptomTextDraft}
            onBeforeInput={handleSymptomTextBeforeInput}
            onChange={(event) => handleSymptomTextChange(event.target.value)}
            onPaste={handleSymptomTextPaste}
            disabled={isExtractingSymptoms}
            maxLength={MAX_SYMPTOM_TEXT_CHARACTERS}
            placeholder="z. B. Seit 3 Tagen starke Kopfschmerzen und leichte Übelkeit."
            className={symptomTextAreaClassName}
            style={{ fontVariationSettings: "'opsz' 14" }}
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <span
              className={`font-['DM_Sans:Medium',sans-serif] text-xs font-medium ${
                symptomTextCharacterCount >= MAX_SYMPTOM_TEXT_CHARACTERS ? "text-red-700" : "text-app-text-muted"
              }`}
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {symptomTextCharacterCount}/{MAX_SYMPTOM_TEXT_CHARACTERS} Zeichen
            </span>
            {isRecordingSymptoms && (
              <span
                className="font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Aufnahme {formattedRecordingElapsed} / {formattedMaxRecordingDuration}
              </span>
            )}
          </div>

          {symptomTextError && (
            <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {symptomTextError}
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 items-start">
            <div className="relative flex h-16 w-16 items-center justify-center justify-self-start">
              <button
                type="button"
                onClick={handleClearSymptomText}
                disabled={isExtractingSymptoms || symptomTextDraft.length === 0}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-600/35"
                aria-label="Freitext löschen"
                title="Freitext löschen"
              >
                <Trash2 className="size-8" aria-hidden="true" />
              </button>
              <span
                className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-24 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Löschen
              </span>
            </div>

            <div className="relative flex h-16 w-16 items-center justify-center justify-self-center">
              <button
                type="button"
                onClick={handleToggleSymptomRecording}
                disabled={isExtractingSymptoms}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-app-text-on-primary shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-[#486284]/25 ${
                  isRecordingSymptoms
                    ? "animate-pulse bg-red-600 hover:bg-red-700"
                    : "bg-[#486284] hover:bg-[#3a4d68]"
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
                className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-48 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {isRecordingSymptoms ? `${formattedRecordingElapsed} / ${formattedMaxRecordingDuration}` : "Diktieren"}
              </span>
            </div>

            <div className="relative flex h-16 w-16 items-center justify-center justify-self-end">
              <button
                type="button"
                onClick={handleApplySymptomText}
                disabled={isExtractingSymptoms || symptomTextDraft.trim().length === 0}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-app-text-on-primary shadow-lg transition-all disabled:cursor-not-allowed ${
                  isExtractingSymptoms || symptomTextDraft.trim().length === 0
                    ? "bg-[#486284]/25"
                    : "bg-[#486284] hover:bg-[#3a4d68]"
                }`}
                aria-label="Symptombeschreibung übernehmen"
              >
                {isExtractingSymptoms ? (
                  <span className="size-7 animate-spin rounded-full border-4 border-white/35 border-t-white" aria-hidden="true" />
                ) : (
                  <Check className="size-8" strokeWidth={3} aria-hidden="true" />
                )}
              </button>
              <span
                className="absolute left-1/2 top-[calc(100%+0.5rem)] min-h-4 w-24 -translate-x-1/2 text-center font-['DM_Sans:Medium',sans-serif] text-xs font-medium text-app-text-primary"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {isExtractingSymptoms ? "Lädt..." : "Bestätigen"}
              </span>
            </div>
          </div>
        </section>
      )}

    </PageShell>
  );
}
