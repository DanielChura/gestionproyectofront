import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: string;
}

const toneStyles: Record<string, string> = {
  green: "border-green-400 bg-green-100 text-green-500",
  blue: "border-blue-200 bg-blue-100 text-blue-600",
  yellow: "border-yellow-200 bg-yellow-100 text-yellow-400",
  red: "border-red-200 bg-red-100 text-red-600",
  neutral: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

const dotStyles: Record<string, string> = {
  green: "bg-green-500",
  blue: "bg-blue-600",
  yellow: "bg-yellow-500",
  red: "bg-red-600",
  neutral: "bg-neutral-400",
};

function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const style = toneStyles[tone] ?? toneStyles.neutral;
  const dot = dotStyles[tone] ?? dotStyles.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs  ${style}`}
    >
      <span className={`w-1 h-1 rounded-full ${dotStyles[tone]}`}></span>
      {children}
    </span>
  );
}

export default StatusBadge;
