import { useState } from "react";
import type { ProjectArea } from "../../../../core/interfaces/project.interface";
import Input from "../../../../shared/components/Input/Input";
import BuildingIcon from "../../../../shared/icons/BuildingIcon";
import ProjectAreaOptions from "./ProjectAreaOptions";
import TaskProperty from "../task-fields/TaskProperty";
export default function ProjectAreaSelector({
  options,
  selected,
  onChange,
  error,
}: {
  options: ProjectArea[];
  selected: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}) {
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
      value={area?.name ?? "Área *"}
      error={error}
    >
      {(close) => (
        <div className="grid gap-2">
          <label htmlFor="project-area-search">Buscar área</label>
          <Input
            id="project-area-search"
            data-panel-focus
            name="area_search"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ProjectAreaOptions
            items={results}
            selected={selected}
            onChange={onChange}
            close={close}
            emptyMessage={
              options.length
                ? "No hay áreas que coincidan."
                : "No hay áreas disponibles."
            }
          />
        </div>
      )}
    </TaskProperty>
  );
}
