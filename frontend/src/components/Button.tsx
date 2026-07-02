import type { ReactNode } from "react";

interface ButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
}

export default function Button({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  className = ""
}: ButtonProps) {
  const baseStyles = "shadow-md rounded-[14px] px-8 py-2.5 transition-all";

  const variantStyles = {
    primary: "bg-[#486284] text-app-text-on-primary hover:bg-[#3a4d68]",
    secondary: "bg-gray-300 text-app-text-body hover:bg-gray-400",
    danger: "bg-[#ffcdcd] text-app-text-body hover:bg-[#ffb8b8]",
  };

  const disabledStyles = "bg-gray-300 text-app-text-subtle cursor-not-allowed hover:bg-gray-300";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
