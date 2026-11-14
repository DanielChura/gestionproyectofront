import { useEffect, useRef, useState } from "react";
import CheckIcon from "../../../../shared/icons/CheckIcon";
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
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 
        bg-indigo-50 px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
      >
        <StackIcon className="size-4" />
        <span>{selected.label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === preferences.mode}
              onClick={() => {
                onChange({ ...preferences, mode: option.value });
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>{option.label}</span>
              {option.value === preferences.mode && (
                <CheckIcon className="size-3.5 text-indigo-700 dark:text-indigo-300" />
              )}
            </button>
          ))}

          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

          {(["asc", "desc"] as const).map((order) => (
            <button
              key={order}
              type="button"
              role="menuitemradio"
              aria-checked={order === preferences.order}
              onClick={() =>
                onChange({
                  ...preferences,
                  order,
                })
              }
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>{order === "asc" ? "Ascendente" : "Descendente"}</span>
              {order === preferences.order && (
                <CheckIcon className="size-3.5 text-indigo-700 dark:text-indigo-300" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
