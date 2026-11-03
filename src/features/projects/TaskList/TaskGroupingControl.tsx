import { useEffect, useRef, useState } from "react";
import StackIcon from "../../../shared/icons/StackIcon";
import type { TaskGroupingMode, TaskGroupingPreferences } from "../types";

const options: { value: TaskGroupingMode; label: string }[] = [
  { value: "state", label: "Estado" },
  { value: "assignees", label: "Persona asignada" },
  { value: "priority", label: "Prioridad" },
  { value: "labels", label: "Etiquetas" },
  { value: "due_date", label: "Fecha límite" },
];

export default function TaskGroupingControl({
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
        aria-label={`Agrupar por: ${selected.label}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-900 bg-blue-950 px-2 py-1 text-xs  text-blue-400 hover:bg-blue-900"
      >
        <StackIcon className="size-4" />
        {selected.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Agrupar por:</span>
            <select
              value={preferences.mode}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  mode: event.target.value as TaskGroupingMode,
                })
              }
              className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800"
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
              className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800"
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
