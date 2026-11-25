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
    <aside className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 px-4 text-xs dark:border-neutral-800">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">
          Actividad
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          {activities.length}{" "}
          {activities.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 text-xs text-neutral-500 dark:text-neutral-400">
        {activities.length === 0 ? (
          <p className="m-auto text-center">No hay actividad registrada</p>
        ) : (
          <ul className="mt-auto space-y-3">
            {activities.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="min-w-0 text-neutral-700 dark:text-neutral-300">
                  <strong className="font-medium text-neutral-800 dark:text-neutral-200">
                    {item.actor_name}
                  </strong>{" "}
                  {activityText(item)}
                </span>
                <time className="shrink-0 text-neutral-400 dark:text-neutral-500">
                  {formatDate(item.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
