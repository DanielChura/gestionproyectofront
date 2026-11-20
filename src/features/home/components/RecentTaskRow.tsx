import CheckIcon from "../../../shared/icons/CheckIcon";
import type { Task } from "../../../core/interfaces/task.interface";

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Urgente", color: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  2: {
    label: "Alta",
    color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/40",
  },
  3: { label: "Normal", color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
  4: {
    label: "Baja",
    color: "text-neutral-500 bg-neutral-100 dark:bg-neutral-800",
  },
};

export default function RecentTaskRow({ task }: { task: Task }) {
  const isDone = task.state_code === "COMPLETADA";
  const priorityInfo = task.priority ? priorityLabels[task.priority] : null;

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
      <td className="px-3 py-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid size-4 place-items-center rounded border ${
              isDone
                ? "border-emerald-600 bg-emerald-600 text-neutral-100"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {isDone && <CheckIcon className="size-3" />}
          </span>
          <span
            className={`truncate  ${isDone ? "line-through text-neutral-400" : "text-neutral-800 dark:text-neutral-200"}`}
          >
            {task.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-xs">
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs  text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {task.state_name || "Sin estado"}
        </span>
      </td>
      <td className="px-3 py-2 text-xs">
        {priorityInfo ? (
          <span
            className={`rounded px-2 py-0.5 text-xs  ${priorityInfo.color}`}
          >
            {priorityInfo.label}
          </span>
        ) : (
          <span className="text-neutral-400">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
        {task.responsible_name || "Sin asignar"}
      </td>
      <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
      </td>
    </tr>
  );
}
