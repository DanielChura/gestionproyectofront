import EmptyState from "../../shared/states/EmptyState/EmptyState";
import EmptyFilters from "../../shared/states/EmptyFilters/EmptyFilters";
import SkeletonCards from "../../shared/states/SkeletonCards/SkeletonCards";
import Input from "../../shared/components/Input/Input";
import Select from "../../shared/components/Select/Select";
import SearchIcon from "../../shared/icons/SearchIcon";
import WorkerCard from "./WorkerCard";
import type { Area } from "../../core/interfaces/organization.interface";
import type { Worker } from "../../core/interfaces/worker.interface";
import type { WorkerListFilters } from "./types";

interface WorkersListProps {
  workers: Worker[];
  total: number;
  areas: Area[];
  filters: WorkerListFilters;
  isLoading?: boolean;
  onFilters: (filters: WorkerListFilters) => void;
  actions: {
    canManage: boolean;
    areaNameById: Map<number, string>;
    onEdit: (worker: Worker) => void;
  };
}

export default function WorkersList({
  workers,
  total,
  areas,
  filters,
  isLoading = false,
  onFilters,
  actions,
}: WorkersListProps) {
  const hasFilters = Boolean(filters.search || filters.status || filters.area);

  return (
    <section>
      <header className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative min-w-52 max-w-xs flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            value={filters.search}
            placeholder="Buscar personas"
            className="pl-8"
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          onChange={(e) => onFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Estado</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>

        <Select
          value={filters.area}
          onChange={(e) => onFilters({ ...filters, area: e.target.value })}
        >
          <option value="">Área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>

        <Select
          value={filters.sort}
          onChange={(e) =>
            onFilters({
              ...filters,
              sort: e.target.value as WorkerListFilters["sort"],
            })
          }
        >
          <option value="asc">Nombre A-Z</option>
          <option value="desc">Nombre Z-A</option>
        </Select>

        <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          {workers.length} de {total} personas
        </span>
      </header>

      {isLoading ? (
        <SkeletonCards count={12} />
      ) : workers.length === 0 ? (
        hasFilters ? (
          <EmptyFilters />
        ) : (
          <EmptyState
            iconName="teams"
            message="No hay trabajadores registrados."
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              areaName={
                worker.area != null
                  ? (actions.areaNameById.get(worker.area) ?? "Sin área")
                  : "Sin área"
              }
              canManage={actions.canManage}
              onEdit={actions.onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
