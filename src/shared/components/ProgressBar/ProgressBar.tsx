import type { CSSProperties } from "react";

interface ProgressBarProps {
  value: number;
  tone?: string;
  label: string;
}

const fillStyles: Record<string, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  neutral: "bg-neutral-900",
};

function ProgressBar({ value, tone = "neutral", label }: ProgressBarProps) {
  const fill = fillStyles[tone] ?? fillStyles.neutral;
  return (
    <div
      className="h-1.5 overflow-hidden bg-neutral-200"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        className={`block h-full ${fill}`}
        style={{ width: `${value}%` } as CSSProperties}
      />
    </div>
  );
}

export default ProgressBar;
