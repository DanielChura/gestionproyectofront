import { useEffect, useRef, useState } from "react";
import FlagIcon from "../../../../../../../shared/Icons/FlagIcon";
import type { TaskFieldView } from "../types";
import { priorityTones } from "../../../../../shared/task-fields/priorityTones";

export default function TaskPriorityCell({ view }: { view: TaskFieldView }) {
  const { task, catalogs, onPatch } = view;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = catalogs.priorities.find((p) => p.code === task.priority);
  const name = current?.name ?? "Sin prioridad";

  return (
    <td className="h-12 px-1.5">
      <div ref={container} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <FlagIcon
            className={`size-4 shrink-0 ${priorityTones[task.priority ?? 0]?.text ?? "text-neutral-400"}`}
            fill
          />
          <span className="truncate">{name}</span>
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-36 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => {
                void onPatch(task, { priority: null });
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              <FlagIcon className="size-4 text-neutral-400" fill />
              <span>Sin prioridad</span>
            </button>
            {catalogs.priorities.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  void onPatch(task, { priority: item.code });
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                  task.priority === item.code
                    ? "bg-neutral-50 font-medium text-neutral-900 dark:bg-neutral-700/50 dark:text-neutral-100"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <FlagIcon
                  className={`size-4 ${priorityTones[item.code]?.text ?? "text-neutral-400"}`}
                  fill
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
