import { useEffect, useRef, useState } from "react";
import SearchIcon from "../../../../shared/icons/SearchIcon";
import XIcon from "../../../../shared/icons/XIcon";

export default function TaskSearchFilter({
  value,
  onChange,
  mode = "input",
}: {
  value: string;
  onChange: (value: string) => void;
  mode?: "input" | "button";
}) {
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

  if (mode === "input") {
    return (
      <div className="relative flex min-w-0 items-center">
        <SearchIcon className="pointer-events-none absolute left-2.5 size-4 text-neutral-400" />
        <input
          type="search"
          placeholder="Buscar tareas…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-48 rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
      </div>
    );
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Buscar tareas"
        aria-expanded={open}
        className={`inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
          value
            ? "text-violet-700 dark:text-violet-300"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <SearchIcon className="size-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-64 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          <SearchIcon className="size-4 shrink-0 text-neutral-400" />
          <input
            autoFocus
            type="search"
            placeholder="Buscar tareas…"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Limpiar búsqueda"
              className="cursor-pointer rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            ></button>
          )}
        </div>
      )}
    </div>
  );
}
