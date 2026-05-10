import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  bgColor?: string;
}

export default function Card({ children, className = "", bgColor = "#eff2f6" }: CardProps) {
  return (
    <div
      className={`rounded-[16px] p-5 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );
}
