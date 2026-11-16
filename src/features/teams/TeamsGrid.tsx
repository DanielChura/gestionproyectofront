import EmptyState from "../../shared/states/EmptyState/EmptyState";
import EmptyFilters from "../../shared/states/EmptyFilters/EmptyFilters";
import Input from "../../shared/components/Input/Input";
import Select from "../../shared/components/Select/Select";
import SearchIcon from "../../shared/icons/SearchIcon";
import TeamCard from "./TeamCard";
import type { TeamFilters } from "./types";
import type { Area, Team } from "../../core/interfaces/organization.interface";

interface TeamsGridProps {
  teams: Team[];
  total: number;
  areas: Area[];
  filters: TeamFilters;
  onFilters: (filters: TeamFilters) => void;
  actions: {
    canManage: boolean;
    onAddMember: (team: Team) => void;
    onEdit: (team: Team) => void;
  };
}

export default function TeamsGrid({
  teams,
  total,
  areas,
  filters,
  onFilters,
  actions,
}: TeamsGridProps) {
  const hasFilters = Boolean(filters.search || filters.status || filters.area);

  return (
    <section aria-label="Equipos">
      <header className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative min-w-52 max-w-xs flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            value={filters.search}
            placeholder="Buscar equipos"
            aria-label="Buscar equipos"
            style="small"
            className="pl-8"
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          aria-label="Filtrar por estado"
          style="small"
          onChange={(e) => onFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Estado</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>

        <Select
          value={filters.area}
          aria-label="Filtrar por área"
          style="small"
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
          aria-label="Ordenar por nombre"
          style="small"
          onChange={(e) =>
            onFilters({
              ...filters,
              sort: e.target.value as TeamFilters["sort"],
            })
          }
        >
          <option value="asc">Nombre A-Z</option>
          <option value="desc">Nombre Z-A</option>
        </Select>

        <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          {teams.length} de {total} equipos
        </span>
      </header>

      {teams.length === 0 ? (
        hasFilters ? (
          <EmptyFilters />
        ) : (
          <EmptyState iconName="teams" message="No hay equipos registrados." />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canManage={actions.canManage}
              onAddMember={actions.onAddMember}
              onEdit={actions.onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
