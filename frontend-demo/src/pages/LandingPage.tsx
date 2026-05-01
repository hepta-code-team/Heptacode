import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import PageShell from "../components/PageShell";
import EmergencySymptomGrid from "../features/emergency/EmergencySymptomGrid";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(true);

  const handleEmergencySymptom = () => {
    // Red Flag symptoms always lead to emergency
    navigate("/result?emergency=true");
  };

  const handleContinue = () => {
    navigate("/patient-data");
  };

  return (
    <PageShell showWizard={true}>
      {isDisclaimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl md:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-disclaimer-title"
          >
            <div className="mb-5 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-[#FEF3C7]">
                <AlertTriangle className="size-7 text-[#F59E0B]" aria-hidden="true" />
              </div>
            </div>
            <h2
              id="landing-disclaimer-title"
              className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-2xl mb-3 text-center"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Wichtiger Hinweis
            </h2>
            <p
              className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed text-center mb-5"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Diese Einschätzung ist <strong>keine medizinische Diagnose</strong> und ersetzt nicht den Besuch bei einem Arzt.
              <strong> KI-Systeme können Fehler machen. </strong> Bei Unsicherheit oder Verschlechterung Ihres Zustands suchen Sie bitte
              umgehend medizinische Hilfe.
            </p>
            <button
              onClick={() => setIsDisclaimerOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#10B981] px-5 py-3 text-white transition-all hover:bg-[#059669]"
            >
              <CheckCircle2 className="size-5" aria-hidden="true" />
              <span
                className="font-['DM_Sans:Bold',sans-serif] font-bold text-base"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Verstanden
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile */}
      <div className="block lg:hidden">
        <h1 className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-2xl mb-3" style={{ fontVariationSettings: "'opsz' 14" }}>
          Leiden Sie unter einem dieser Symptome?
        </h1>
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-base mb-5" style={{ fontVariationSettings: "'opsz' 14" }}>
          Bitte wählen Sie das Symptom aus, unter dem Sie leiden oder Überspringen Sie diese Seite.
        </p>

        <EmergencySymptomGrid onSymptomClick={handleEmergencySymptom} variant="mobile" />

        <button onClick={handleContinue} className="bg-[#ffcdcd] rounded-[16px] px-4 py-3 mb-3 hover:bg-[#ffb8b8] transition-all w-full flex items-center justify-center gap-2">
          <X className="size-8 flex-shrink-0 text-[#ff2546]" strokeWidth={3} aria-hidden="true" />
          <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base">Keines davon/Ich weiß es nicht</p>
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <h1
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-2xl md:text-3xl mb-2"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Leiden Sie unter einem dieser Symptome?
        </h1>
        <p
          className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-base md:text-lg mb-4"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          Bitte wählen Sie das Symptom aus, unter dem Sie leiden oder Überspringen Sie diese Seite.
        </p>

        <EmergencySymptomGrid onSymptomClick={handleEmergencySymptom} variant="desktop" />

        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="bg-[#ffcdcd] rounded-[16px] p-4 min-h-[80px] flex items-center justify-center hover:bg-[#ffb8b8] transition-all gap-2"
          >
            <X className="size-[38px] flex-shrink-0 text-[#ff2546]" strokeWidth={3} aria-hidden="true" />
            <p
              className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[#3e3e3e] text-base"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              Keines davon/Ich weiß es nicht
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
