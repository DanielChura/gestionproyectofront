import { useEffect, useRef, useState } from "react";
import StackIcon from "../../../../shared/icons/StackIcon";
import type { TaskGroupingMode, TaskGroupingPreferences } from "../../types";

const options: { value: TaskGroupingMode; label: string }[] = [
  { value: "state", label: "Estado" },
  { value: "assignees", label: "Persona asignada" },
  { value: "priority", label: "Prioridad" },
  { value: "labels", label: "Etiquetas" },
  { value: "due_date", label: "Fecha límite" },
];

export default function TaskGroupingFilter({
  preferences,
  onChange,
}: {
  preferences: TaskGroupingPreferences;
  onChange: (next: TaskGroupingPreferences) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === preferences.mode) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
      >
        <StackIcon className="size-4" />
        <span>Agrupar: {selected.label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Agrupar por:</span>
            <select
              value={preferences.mode}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  mode: event.target.value as TaskGroupingMode,
                })
              }
              className="cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={preferences.order}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  order: event.target.value === "desc" ? "desc" : "asc",
                })
              }
              className="cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
