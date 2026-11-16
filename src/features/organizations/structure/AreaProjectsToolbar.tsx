import SearchIcon from "../../../shared/icons/SearchIcon";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import type { ProjectSort } from "./useStructure";

interface AreaProjectsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  modeFilter: string;
  onModeFilterChange: (value: string) => void;
  sort: ProjectSort;
  onSortChange: (value: ProjectSort) => void;
  count: number;
}

export default function AreaProjectsToolbar({
  search,
  onSearchChange,
  modeFilter,
  onModeFilterChange,
  sort,
  onSortChange,
  count,
}: AreaProjectsToolbarProps) {
  const hasFilters = search !== "" || modeFilter !== "" || sort !== "asc";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="relative min-w-44 max-w-xs flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
        <Input
          type="search"
          value={search}
          placeholder="Buscar proyectos..."
          style="small"
          className="!pl-8"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onSearchChange(e.target.value)
          }
        />
      </div>

      <Select
        value={modeFilter}
        style="small"
        aria-label="Filtrar por modo"
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onModeFilterChange(e.target.value)
        }
      >
        <option value="">Todos los modos</option>
        <option value="available">Disponible</option>
        <option value="assigned">Asignado</option>
      </Select>

      <Select
        value={sort}
        style="small"
        aria-label="Ordenar proyectos"
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onSortChange(e.target.value as ProjectSort)
        }
      >
        <option value="asc">Nombre A-Z</option>
        <option value="desc">Nombre Z-A</option>
        <option value="recent">Más recientes</option>
        <option value="oldest">Más antiguos</option>
      </Select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            onSearchChange("");
            onModeFilterChange("");
            onSortChange("asc");
          }}
          className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
        >
          Limpiar
        </button>
      )}

      <span className="ml-auto text-xs text-neutral-400">
        {count} {count === 1 ? "proyecto" : "proyectos"}
      </span>
    </div>
  );
}
