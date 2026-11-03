interface KpiCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}

const topBorderStyles: Record<string, string> = {
  green: "border-t-green-500",
  blue: "border-t-blue-500",
  yellow: "border-t-yellow-500",
  red: "border-t-red-500",
  neutral: "border-t-neutral-900",
};

const barStyles: Record<string, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  neutral: "bg-neutral-900",
};

function KpiCard({ label, value, detail, tone = "neutral" }: KpiCardProps) {
  const topBorder = topBorderStyles[tone] ?? topBorderStyles.neutral;
  const bar = barStyles[tone] ?? barStyles.neutral;
  return (
    <article
      className={`min-w-0 px-4 py-4 bg-white border border-neutral-200 border-t-[3px] ${topBorder}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-[3px] h-3.5 ${bar}`} aria-hidden="true" />
        <span className="text-neutral-900 text-sm font-">{label}</span>
      </div>
      <strong className="block mt-4 text-neutral-900 text-3xl leading-none tracking-tight font-">
        {value}
      </strong>
      <p className="m-0 mt-2 text-neutral-600 text-xs">{detail}</p>
    </article>
  );
}

export default KpiCard;
