import imgConfusion from "../../assets/emergency/confusion.png";
import imgHeadache from "../../assets/emergency/headache.png";
import imgHeartPain from "../../assets/emergency/heartpain.png";
import imgIconAtemnot from "../../assets/emergency/shortness-of-breath.png";
import imgSevereBleeding from "../../assets/emergency/severbleeding.png";
import imgStomachPain from "../../assets/emergency/stomachpain.png";

interface EmergencySymptomGridProps {
  onSymptomClick: () => void;
  variant?: "mobile" | "desktop";
}

const symptoms = [
  {
    name: "Akute Atemnot",
    desc: "Plötzliche Probleme beim Atmen oder starke Luftnot",
    descLong: "Plötzliche oder starke Probleme beim Atmen. Sie bekommen schlecht Luft oder fühlen sich, als würde die Atmung nicht ausreichen.",
    icon: imgIconAtemnot,
  },
  {
    name: "Starke Brustschmerzen",
    desc: "Starker Schmerz oder Druck in der Brust",
    descLong: "Starker Schmerz, Druck oder Engegefühl in der Brust. Besonders wichtig, wenn es plötzlich beginnt oder nicht nachlässt.",
    icon: imgHeartPain,
  },
  {
    name: "Starke Bauchschmerzen",
    desc: "Sehr starke Schmerzen im Bauchbereich",
    descLong: "Sehr starker Bauchschmerz, der plötzlich auftritt oder rasch schlimmer wird. Vor allem auffällig bei harter Bauchdecke, Übelkeit oder starkem Unwohlsein.",
    icon: imgStomachPain,
  },
  {
    name: "Starke Blutungen",
    desc: "Starke oder nicht stoppende Blutung",
    descLong: "Blutung, die stark ist, nicht aufhört oder schnell viel Blutverlust verursacht. Auch wichtig bei tiefen Wunden oder wenn Kleidung rasch durchblutet.",
    icon: imgSevereBleeding,
  },
  {
    name: "Seh-/Sprachstörungen oder Lähmung",
    desc: "Plötzliche Seh-, Sprach- oder Bewegungsprobleme",
    descLong: "Plötzliche Probleme beim Sehen, Sprechen oder Verstehen sowie die Lähmung einer Körperhälfte.",
    icon: imgConfusion,
  },
  {
    name: "Starke Kopfschmerzen",
    desc: "Sehr starke oder plötzlich einsetzende Kopfschmerzen",
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
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm mb-1" style={{ fontVariationSettings: "'opsz' 14" }}>
                {symptom.name}
              </p>
              <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-xs leading-snug" style={{ fontVariationSettings: "'opsz' 14" }}>
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
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-lg mb-1"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {symptom.name}
            </p>
            <p
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-snug"
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
            className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-lg mb-1"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Starke Kopfschmerzen
          </p>
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-snug"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Sehr starke, ungewohnte oder plötzlich einsetzende Kopfschmerzen. Besonders auffällig, wenn sie anders sind als sonst oder sehr heftig beginnen.
          </p>
        </div>
      </button>
    </div>
  );
}
