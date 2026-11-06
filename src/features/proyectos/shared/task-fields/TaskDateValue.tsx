import { formatTaskDate } from "../../utils/taskHierarchy";
import { isPastTaskDate } from "./taskDates";

const shortDate = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  day: "numeric",
});

function formatShortDate(value: string) {
  const parts = shortDate.formatToParts(new Date(`${value}T12:00:00`));
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${month.replace(/\.$/u, "")}. ${day}`;
}

export default function TaskDateValue({
  value,
  short,
}: {
  value?: string | null;
  short?: boolean;
}) {
  const past = isPastTaskDate(value);
  return (
    <span className={past ? "text-red-600 dark:text-red-400" : undefined}>
      {short && value ? formatShortDate(value) : formatTaskDate(value)}
      {past && <span className="sr-only"> · Fecha anterior a hoy</span>}
    </span>
  );
}

