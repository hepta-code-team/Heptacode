import imgConfusion from "../../assets/emergency/confusion.png";
import imgHeadache from "../../assets/emergency/headache.png";
import imgHeartPain from "../../assets/emergency/heartpain.png";
import imgIconAtemnot from "../../assets/emergency/shortness-of-breath.png";
import imgSevereBleeding from "../../assets/emergency/severbleeding.png";
import allergy from "../../assets/emergency/allergy.png";
interface EmergencySymptomGridProps {
  onSymptomClick: () => void;
  variant?: "mobile" | "desktop";
}

const symptoms = [
  {
    name: "Akute Atemnot",
    desc: "Plötzliche Probleme beim Atmen oder starke Luftnot.",
    descLong: "Plötzliche oder starke Probleme beim Atmen. Sie bekommen schlecht Luft oder fühlen sich, als würde die Atmung nicht ausreichen.",
    icon: imgIconAtemnot,
  },
  {
    name: "Starke Brustschmerzen",
    desc: "Starker Schmerz, Druck oder ein Engegefühl in der Brust, das nicht nachlässt.",
    descLong: "Starker Schmerz, Druck oder Engegefühl in der Brust. Besonders wichtig, wenn es plötzlich beginnt oder nicht nachlässt.",
    icon: imgHeartPain,
  },
  {
    name: "Seh-/Sprachstörungen oder Lähmung",
    desc: "Plötzlich auftetende Seh-, Sprach- oder Bewegungsprobleme. Außerdem ein hängender Mundwinkel oder verwaschene Sprache.",
    descLong: "Einseitige Lähmung oder Taubheit, ein hängender Mundwinkel, verwaschene Sprache, starke Verwirrtheit oder plötzlich auftretende Sehstörungen.",
    icon: imgConfusion,
  },
  {
    name: "Starke Blutungen / Knochenbruch",
    desc: "Starke Blutung, offene Wunde oder Verdacht auf Knochenbruch",
    descLong: "Starke Blutung, die nicht aufhört oder schnell zu viel Blutverlust führt. Auch bei tiefen Wunden, sichtbarer Fehlstellung oder Verdacht auf einen Knochenbruch.",
    icon: imgSevereBleeding,
  },
  {
    name: "Allergische Reaktion",
    desc: "Starke allergische Reaktion, wie Atmenot, ein Engegefühl im Hals oder Schwellungen.",
    descLong: "Starke Atemnot, ein Engegefühl im Hals, Schwellungen im Gesicht, starker Hautausschlag oder Schwindel und Kreislaufprobleme.",
    icon: allergy,
  },
  {
    name: "Starke Kopfschmerzen",
    desc: "Sehr starke, ungewohnte oder plötzlich einsetzende Kopfschmerzen.",
    descLong: "Sehr starke, ungewohnte oder plötzlich einsetzende Kopfschmerzen. Besonders auffällig, wenn sie anders sind als sonst oder sehr heftig beginnen.",
    icon: imgHeadache,
  },
];

export default function EmergencySymptomGrid({ onSymptomClick, variant = "mobile" }: EmergencySymptomGridProps) {
  if (variant === "mobile") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {symptoms.map((symptom) => (
          <button
            key={symptom.name}
            onClick={onSymptomClick}
            className="bg-[#eff2f6] rounded-[16px] p-3 min-h-[85px] hover:bg-[#dde3ea] transition-all flex items-start gap-3"
          >
            <img
              alt=""
              className="size-14 flex-shrink-0 object-contain"
              src={symptom.icon}
              aria-hidden="true"
            />
            <div className="flex-1 text-left">
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-sm mb-1" style={{ fontVariationSettings: "'opsz' 14" }}>
                {symptom.name}
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-xs leading-snug" style={{ fontVariationSettings: "'opsz' 14" }}>
                {symptom.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {symptoms.slice(0, 5).map((symptom) => (
        <button
          key={symptom.name}
          onClick={onSymptomClick}
          className="bg-[#eff2f6] rounded-[16px] p-3 min-h-[140px] flex items-start gap-3 hover:bg-[#dde3ea] transition-all"
        >
          <img
            alt=""
            className="size-20 flex-shrink-0 object-contain"
            src={symptom.icon}
            aria-hidden="true"
          />
          <div className="flex-1 text-left">
            <p
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-lg mb-1"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {symptom.name}
            </p>
            <p
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-snug"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {symptom.descLong}
            </p>
          </div>
        </button>
      ))}

      {/* Special layout for Starke Kopfschmerzen on desktop */}
      <button
        onClick={onSymptomClick}
        className="bg-[#eff2f6] rounded-[16px] p-3 min-h-[140px] flex items-start gap-3 hover:bg-[#dde3ea] transition-all"
      >
        <img
          alt=""
          className="size-20 flex-shrink-0 object-contain"
          src={imgHeadache}
          aria-hidden="true"
        />
        <div className="flex-1 text-left">
          <p
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-body text-lg mb-1"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Starke Kopfschmerzen
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-body text-sm leading-snug"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Sehr starke, ungewohnte oder plötzlich einsetzende Kopfschmerzen. Besonders auffällig, wenn sie anders sind als sonst oder sehr heftig beginnen.
          </p>
        </div>
      </button>
    </div>
  );
}
