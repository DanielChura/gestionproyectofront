import type { TaskActivityEvent } from "../../types";
import { activityText } from "./activityText";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

interface TaskActivityFeedProps {
  activities: TaskActivityEvent[];
}

export default function TaskActivityFeed({
  activities,
}: TaskActivityFeedProps) {
  return (
    <aside className="flex h-full flex-col border-l border-neutral-200 dark:border-neutral-800">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 px-4 text-xs dark:border-neutral-800">
        <span className="font-medium">Actividad</span>
        <span className="text-neutral-300 dark:text-neutral-500">
          {activities.length}{" "}
          {activities.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 text-[11px] text-neutral-500 dark:text-neutral-400">
        {activities.length === 0 ? (
          <p className="m-auto text-center">No hay actividad registrada</p>
        ) : (
          <ul className="mt-auto space-y-3">
            {activities.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="min-w-0">
                  {item.actor_name} {activityText(item)}
                </span>
                <time className="shrink-0">{formatDate(item.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
