import { useNavigate } from "react-router";
import { X } from "lucide-react";
import PageShell from "../components/PageShell";
import EmergencySymptomGrid from "../features/emergency/EmergencySymptomGrid";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleEmergencySymptom = () => {
    // Red Flag symptoms always lead to emergency
    navigate("/result?emergency=true");
  };

  const handleContinue = () => {
    navigate("/patient-data");
  };

  return (
    <PageShell showWizard={true}>
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
