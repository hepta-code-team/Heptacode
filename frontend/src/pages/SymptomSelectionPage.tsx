import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Brain, Check, Mic, Sparkles, X } from "lucide-react";
import PageShell from "../components/PageShell";
import Button from "../components/Button";
import Modal from "../components/Modal";
import SymptomButtonGrid from "../features/symptoms/SymptomButtonGrid";
import { useAssessment } from "../lib/AssessmentContext";
import {
  BODY_AREA_LABELS,
  BODY_AREA_REGION_IDS,
  EMERGENCY_SYMPTOM_OPTIONS,
  getBodyRegionsForCategory,
  MAX_SYMPTOMS,
  type BodyAreaCategory,
} from "../features/symptoms/symptoms.constants";
import type { SelectedSymptom } from "../types/assessment";

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

function getSymptomKey(symptom: SelectedSymptom) {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
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
      className="mx-auto h-[220px] w-[150px] md:h-[320px] md:w-[205px]"
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
          d="M69 96 C45 106 33 135 27 178 C23 205 31 229 45 229 C58 229 59 205 62 183 C66 151 75 125 86 112 Z"
          fill={partFill("arms")}
          stroke={partStroke("arms")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path
          d="M151 96 C175 106 187 135 193 178 C197 205 189 229 175 229 C162 229 161 205 158 183 C154 151 145 125 134 112 Z"
          fill={partFill("arms")}
          stroke={partStroke("arms")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <text x="23" y="168" fill={labelFill("arms")} fontSize="13" fontWeight="700" transform="rotate(-75 23 168)">Arm</text>
        <text x="183" y="168" fill={labelFill("arms")} fontSize="13" fontWeight="700" transform="rotate(75 183 168)">Arm</text>
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
          d="M76 214 C91 219 105 221 110 221 L104 326 C103 339 94 346 84 342 C75 338 75 326 76 316 Z"
          fill={partFill("legs")}
          stroke={partStroke("legs")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path
          d="M110 221 C115 221 129 219 144 214 L144 316 C145 326 145 338 136 342 C126 346 117 339 116 326 Z"
          fill={partFill("legs")}
          stroke={partStroke("legs")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <text x="83" y="282" fill={labelFill("legs")} fontSize="13" fontWeight="700" transform="rotate(88 83 282)">Bein</text>
        <text x="133" y="282" fill={labelFill("legs")} fontSize="13" fontWeight="700" transform="rotate(92 133 282)">Bein</text>
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
          d="M76 88 C86 78 134 78 144 88 C157 106 165 151 153 183 C145 205 130 219 110 221 C90 219 75 205 67 183 C55 151 63 106 76 88 Z"
          fill={partFill("torso")}
          stroke={partStroke("torso")}
          strokeWidth="4"
          filter="url(#body-shadow)"
        />
        <path d="M88 82 C95 95 125 95 132 82" fill="none" stroke="#d7dee7" strokeWidth="4" strokeLinecap="round" />
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
        <path d="M99 42 C102 45 118 45 121 42" fill="none" stroke={labelFill("head")} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
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
  const { selectedSymptoms: contextSymptoms, setSelectedSymptoms: setContextSymptoms } = useAssessment();
  const [selectedCategory, setSelectedCategory] = useState<BodyAreaCategory | null>(initialCategory);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>(contextSymptoms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symptomText, setSymptomText] = useState("");
  const symptomOptionsRef = useRef<HTMLDivElement | null>(null);

  const selectedCategoryLabel = selectedCategory ? BODY_AREA_LABELS[selectedCategory] : "";
  const filteredRegions = useMemo(() => getBodyRegionsForCategory(selectedCategory), [selectedCategory]);
  const shouldShowInlineOptions = selectedCategory !== "torso";

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
    navigate("/symptom-details");
  };

  return (
    <PageShell
      title="Wo haben Sie Beschwerden?"
      subtitle="Wählen Sie einen Bereich am Körper und ergänzen Sie bis zu 3 passende Beschwerden."
      onBack={() => navigate("/patient-data")}
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 xl:gap-6 items-start">
        <div className="rounded-[18px] bg-[#f5f7fa] p-4">
          <p
            className="mb-3 text-center font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-sm"
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
                    isSelected ? "bg-[#486284] text-white" : "bg-white text-[#3e3e3e] hover:bg-[#dde3ea]"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelected ? "bg-white/20 text-white" : "bg-[#eff2f6] text-[#486284]"
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
                          isSelected ? "text-white/85" : "text-[#486284]"
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
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-[14px] bg-white p-3 text-left text-[#3e3e3e] transition-all hover:bg-[#dde3ea]"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-[#eff2f6] text-[#486284]">
                  <Mic className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p
                    className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    Symptome beschreiben
                  </p>
                  <p
                    className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs leading-snug"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    Freitext oder Spracheingabe
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-4 rounded-[18px] bg-[#f5f7fa] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-sm"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Ihre Auswahl
              </p>
              <p
                className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs"
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
                    symptom ? "border-[#486284] bg-white text-[#3e3e3e]" : "border-dashed border-[#cfd5dd] bg-white/70 text-[#828b93]"
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
                        className="rounded-full p-0.5 text-[#486284] hover:bg-[#eff2f6]"
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
                  className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                >
                  {selectedCategoryLabel}
                </p>
                <p
                  className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-sm"
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
                className="max-w-md font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-sm leading-relaxed"
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
          setIsModalOpen(false);
          setSymptomText("");
        }}
        title="Beschreiben Sie Ihre Symptome"
        subtitle="Bitte beschreiben Sie Ihre Symptome in 1-2 Sätzen. Nennen Sie dabei die Stärke und Dauer der jeweiligen Symptome."
      >
        <textarea
          value={symptomText}
          onChange={(event) => setSymptomText(event.target.value)}
          placeholder="z.B. Ich habe seit 3 Tagen starke Kopfschmerzen (7/10) und leichte Übelkeit."
          className="w-full h-40 bg-[#eff2f6] rounded-[16px] p-4 resize-none border-none outline-none focus:ring-2 focus:ring-[#486284] font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-base"
          style={{ fontVariationSettings: "'opsz' 14" }}
        />

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => {}}
            className="bg-[#486284] text-white rounded-full w-16 h-16 hover:bg-[#3a4d68] transition-all shadow-lg flex items-center justify-center"
            aria-label="Symptom diktieren"
          >
            <Mic className="size-8" aria-hidden="true" />
          </button>

          <button
            onClick={() => setIsModalOpen(false)}
            className="bg-[#486284] text-white rounded-full w-16 h-16 hover:bg-[#3a4d68] transition-all shadow-lg flex items-center justify-center"
            aria-label="Symptombeschreibung übernehmen"
          >
            <Check className="size-8" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}
