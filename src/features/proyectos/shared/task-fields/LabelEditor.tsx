import { useId, useState } from "react";
import type {
  Label,
  Specialty,
} from "../../../../core/interfaces/task.interface";
import LabelList from "../LabelList";

export default function LabelEditor({
  title,
  labels,
  onChange,
  specialties,
}: {
  title: string;
  labels: Label[];
  onChange: (labels: Label[]) => void;
  compact?: boolean;
  specialties?: Specialty[];
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const results =
    specialties?.filter((item) =>
      item.name
        .toLocaleLowerCase("es")
        .includes(query.trim().toLocaleLowerCase("es")),
    ) ?? [];

  return (
    <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
      <legend className="mb-1 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
        {title}
      </legend>
      <label
        htmlFor={id}
        className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
      >
        Buscar especialidades
      </label>
      <input
        id={id}
        name="specialty_search"
        type="search"
        autoComplete="off"
        placeholder="Buscar especialidades…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      <div
        className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800"
        role="group"
        aria-label="Especialidades"
      >
        {specialties === undefined && (
          <p
            role="alert"
            className="p-3 text-xs text-red-600 dark:text-red-400"
          >
            El catálogo no está disponible. Reintenta la carga de catálogos.
          </p>
        )}
        {specialties !== undefined && results.length === 0 && (
          <p
            role="status"
            className="p-3 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {specialties.length
              ? "No hay coincidencias."
              : "No hay especialidades registradas."}
          </p>
        )}
        {results.map((item) => {
          const selected = labels.some(
            (label) => label.specialty_id === item.id,
          );
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              disabled={!selected && labels.length >= 50}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:cursor-default disabled:opacity-50"
              onClick={() =>
                onChange(
                  selected
                    ? labels.filter((label) => label.specialty_id !== item.id)
                    : [
                        ...labels,
                        {
                          name: item.name,
                          kind: "specialty",
                          specialty_id: item.id,
                        },
                      ],
                )
              }
            >
              <span
                aria-hidden="true"
                className="inline-grid size-4 shrink-0 place-items-center rounded border border-neutral-300 dark:border-neutral-600 text-[10px]"
              >
                {selected ? "✓" : ""}
              </span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
      <LabelList
        labels={labels}
        onRemove={(index) =>
          onChange(labels.filter((_, position) => index !== position))
        }
      />
    </fieldset>
  );
}
