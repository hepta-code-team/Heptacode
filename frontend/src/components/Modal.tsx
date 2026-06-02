import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
  showCloseButton = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white rounded-[24px] shadow-2xl ${maxWidth} w-full p-8 md:p-10 max-h-[80vh] overflow-y-auto`}>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-app-text-primary transition-colors hover:bg-[#eff2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#486284]"
            aria-label="Fenster schließen"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}

        <h2
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-app-text-primary text-2xl md:text-3xl mb-3"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-app-text-primary text-base mb-5"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}