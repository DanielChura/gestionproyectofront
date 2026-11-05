import { formatTaskDate } from "../../utils/taskHierarchy";
import { isPastTaskDate } from "./taskDates";

export default function TaskDateValue({ value }: { value?: string | null }) {
  const past = isPastTaskDate(value);
  return (
    <span className={past ? "text-red-600 dark:text-red-400" : undefined}>
      {formatTaskDate(value)}
      {past && <span className="sr-only"> · Fecha anterior a hoy</span>}
    </span>
  );
}

