import { useId, useState } from "react";
import type { Label, Specialty } from "../types";
import LabelList from "../LabelList/LabelList";

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
  const id = useId(),
    [query, setQuery] = useState("");
  const results =
    specialties?.filter((item) =>
      item.name
        .toLocaleLowerCase("es")
        .includes(query.trim().toLocaleLowerCase("es")),
    ) ?? [];
  return (
    <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
      <legend className="mb-2 text-sm ">{title}</legend>
      <label htmlFor={id}>Buscar especialidades</label>
      <input
        id={id}
        name="specialty_search"
        type="search"
        autoComplete="off"
        placeholder="Buscar especialidades…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div
        className="max-h-48 overflow-y-auto overscroll-contain"
        role="group"
        aria-label="Especialidades"
      >
        {specialties === undefined && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            El catálogo no está disponible. Reintenta la carga de catálogos.
          </p>
        )}
        {specialties !== undefined && results.length === 0 && (
          <p
            role="status"
            className="text-xs text-neutral-600 dark:text-neutral-400"
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
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800  disabled:cursor-default disabled:opacity-50"
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
                className="inline-grid size-4 shrink-0 place-items-center rounded border border-neutral-400 dark:border-neutral-500"
              >
                {selected ? "✓" : ""}
              </span>
              {item.name}
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
      {labels.some((label) => label.specialty_id == null) && (
        <p className="m-0 text-xs text-neutral-600 dark:text-neutral-400">
          Se conservan las etiquetas históricas; puedes retirarlas sin
          vincularlas a otra especialidad.
        </p>
      )}
    </fieldset>
  );
}
