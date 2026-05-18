import { useState } from "react";
import { CircleHelp } from "lucide-react";
import Modal from "../../components/Modal";
import PainScaleSelector from "./PainScaleSelector";
import DurationSelector from "./DurationSelector";
import { getMeasurementConfig } from "./symptoms.constants";
import type { Symptom } from "../../types/assessment";

interface SymptomDetailsFormProps {
  symptom: Symptom;
  onUpdate: (field: keyof Symptom, value: Symptom[keyof Symptom]) => void;
  onRemove: () => void;
  showDurationError?: boolean;
}

function getSymptomTitle(symptom: Symptom) {
  return symptom.side ? `${symptom.region} (${symptom.side})` : symptom.region;
}

function getSymptomInfo(symptom: Symptom) {
  const text = `${symptom.region} ${symptom.side ?? ""}`.toLowerCase();

  if (text.includes("atemnot")) {
    return "Gemeint ist das Gefühl, schlechter Luft zu bekommen, schneller atmen zu müssen oder beim Sprechen bzw. in Ruhe kurzatmig zu sein.";
  }

  if (text.includes("druckgefühl") || text.includes("enge")) {
    return "Gemeint ist ein Druck, Engegefühl oder Beklemmungsgefühl, besonders im Brustbereich.";
  }

  if (text.includes("herzrasen") || text.includes("herzstechen")) {
    return "Gemeint sind ungewöhnlich schnelle, stolpernde oder stechende Beschwerden im Bereich des Herzens.";
  }

  if (text.includes("fieber")) {
    return "Gemeint ist erhöhte Körpertemperatur. Falls möglich, tragen Sie den gemessenen Wert ein.";
  }

  if (text.includes("schüttelfrost")) {
    return "Gemeint ist starkes Frieren, Zittern oder Kältegefühl, häufig zusammen mit Fieber oder Infektgefühl.";
  }

  if (text.includes("kribbeln") || text.includes("taubheit")) {
    return "Gemeint sind Gefühlsstörungen wie Ameisenlaufen, Taubheitsgefühl oder vermindertes Gefühl.";
  }

  if (text.includes("geschwollen") || text.includes("schwellung") || text.includes("ödeme")) {
    return "Gemeint ist eine sichtbare oder spürbare Schwellung, zum Beispiel an Bein, Wade, Knöchel oder Brust.";
  }

  if (text.includes("brennen beim urinieren")) {
    return "Gemeint sind Schmerzen oder Brennen beim Wasserlassen.";
  }

  if (text.includes("juckreiz")) {
    return "Gemeint ist ein störender Juckreiz, zum Beispiel im Intimbereich oder an der Haut.";
  }

  if (text.includes("verbrennung") || text.includes("sonnenbrand")) {
    return "Gemeint sind Beschwerden nach Hitze, Feuer, heißer Flüssigkeit oder starker Sonneneinstrahlung.";
  }

  if (text.includes("verwirrtheit") || text.includes("desorientierung")) {
    return "Gemeint ist, wenn Denken, Orientierung, Sprache oder Aufmerksamkeit ungewöhnlich verändert sind.";
  }

  return "Beschreiben Sie hier, wie stark diese konkrete Beschwerde ist und seit wann sie besteht.";
}

export default function SymptomDetailsForm({
  symptom,
  onUpdate,
  onRemove,
  showDurationError = false,
}: SymptomDetailsFormProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const measurementConfig = getMeasurementConfig(symptom.region, symptom.side);
  const title = getSymptomTitle(symptom);

  return (
    <div className="bg-[#eff2f6] rounded-[16px] p-5 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-4 right-4 text-[#486284] hover:text-[#3a4d68] transition-all"
        aria-label={`${title} entfernen`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mb-4 flex items-start gap-2 pr-8">
        <p
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {title}
        </p>

        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          className="mt-0.5 inline-flex size-6 flex-shrink-0 items-center justify-center rounded-full text-[#486284] transition-all hover:bg-[#dde3ea]"
          aria-label={`Informationen zu ${title}`}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      </div>

      <PainScaleSelector
        config={measurementConfig}
        value={symptom.measurementValue}
        onValueChange={(value) => onUpdate("measurementValue", value)}
      />

      <DurationSelector
        selectedDuration={symptom.duration}
        onDurationChange={(duration) => onUpdate("duration", duration)}
        showError={showDurationError && symptom.duration === ""}
      />

      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title={title}
        subtitle={getSymptomInfo(symptom)}
        maxWidth="max-w-lg"
      >
        <button
          type="button"
          onClick={() => setIsInfoOpen(false)}
          className="w-full rounded-[14px] bg-[#486284] px-5 py-3 text-white transition-all hover:bg-[#3a4d68]"
        >
          Verstanden
        </button>
      </Modal>
    </div>
  );
}
