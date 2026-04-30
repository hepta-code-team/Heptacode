import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl"
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white rounded-[24px] shadow-2xl ${maxWidth} w-full p-8 md:p-10 max-h-[80vh] overflow-y-auto`}>
        <h2
          className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-2xl md:text-3xl mb-3"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-base mb-5"
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
