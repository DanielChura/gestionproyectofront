import type {
  PublicationFilters,
  PublicationProject,
  PublicationStateCode,
} from "../../../core/interfaces/publication.interface";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import SearchIcon from "../../../shared/icons/SearchIcon";
import { PUBLICATION_STATE_LABELS } from "../utils/publication";

interface PublicationsFiltersProps {
  filters: PublicationFilters;
  projects: PublicationProject[];
  count: number;
  onSearch: (value: string) => void;
  onChange: (filters: PublicationFilters) => void;
}

export default function PublicationsFilters({
  filters,
  projects,
  count,
  onSearch,
  onChange,
}: PublicationsFiltersProps) {
  return (
    <header className="flex flex-wrap items-center gap-2 pb-4">
      <div className="relative min-w-52 max-w-xs flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          value={filters.search ?? ""}
          placeholder="Buscar publicaciones"
          className="pl-8"
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <Select
        value={filters.state ?? ""}
        aria-label="Filtrar por estado"
        onChange={(event) => {
          const state = event.target.value;
          onChange({
            ...filters,
            state: state ? (state as PublicationStateCode) : undefined,
          });
        }}
      >
        <option value="">Todos los estados</option>
        {Object.entries(PUBLICATION_STATE_LABELS).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        value={filters.project_id ? String(filters.project_id) : ""}
        aria-label="Filtrar por proyecto"
        onChange={(event) => {
          const value = event.target.value;
          onChange({
            ...filters,
            project_id: value ? Number(value) : undefined,
          });
        }}
      >
        <option value="">Todos los proyectos</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
        {count} {count === 1 ? "publicación" : "publicaciones"}
      </span>
    </header>
  );
}
