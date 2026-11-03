import { useState } from "react";
import type { ProjectArea } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import BuildingIcon from "../../../shared/icons/BuildingIcon";
import CheckIcon from "../../../shared/icons/CheckIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";
interface AreaSelectorProps {
  options: ProjectArea[];
  selected: number[];
  onChange: (selected: number[]) => void;
  error?: string;
}

export default function AreaSelector({
  options,
  selected,
  onChange,
  error = "",
}: AreaSelectorProps) {
  const [search, setSearch] = useState("");
  const area = options.find((item) => item.id === selected[0]);
  const results = options.filter((item) =>
    item.name
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es")),
  );

  return (
    <TaskProperty
      id="project-areas"
      label="Área obligatoria"
      icon={BuildingIcon}
      error={error}
      value={area?.name ?? "Área *"}
    >
      {(close) => (
        <>
          <label htmlFor="project-area-search">Buscar área</label>
          <input
            id="project-area-search"
            name="area_search"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div
            className={styles.options}
            role="group"
            aria-label="Áreas disponibles"
          >
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.option}
                aria-pressed={selected[0] === item.id}
                onClick={() => {
                  if (selected[0] !== item.id) onChange([item.id]);
                  close();
                }}
              >
                <span>{item.name}</span>
                {selected[0] === item.id && <CheckIcon className="size-4" />}
              </button>
            ))}
            {results.length === 0 && (
              <p className={styles.hint} role="status">
                {options.length === 0
                  ? "No hay áreas disponibles."
                  : "No hay áreas que coincidan."}
              </p>
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              className={styles.done}
              onClick={() => {
                onChange([]);
                close();
              }}
            >
              Quitar selección
            </button>
          )}
        </>
      )}
    </TaskProperty>
  );
}
