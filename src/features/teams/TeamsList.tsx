import EmptyState from "../../shared/states/EmptyState/EmptyState";
import EmptyFilters from "../../shared/states/EmptyFilters/EmptyFilters";
import SkeletonCards from "../../shared/states/SkeletonCards/SkeletonCards";
import Input from "../../shared/components/Input/Input";
import Select from "../../shared/components/Select/Select";
import SearchIcon from "../../shared/icons/SearchIcon";
import TeamCard from "./TeamCard";
import type { TeamFilters } from "./types";
import type { Area, Team } from "../../core/interfaces/organization.interface";

interface TeamsListProps {
  teams: Team[];
  total: number;
  areas: Area[];
  filters: TeamFilters;
  isLoading?: boolean;
  onFilters: (filters: TeamFilters) => void;
  actions: {
    canManage: boolean;
    onAddMember: (team: Team) => void;
    onEdit: (team: Team) => void;
  };
}

export default function TeamsList({
  teams,
  total,
  areas,
  filters,
  isLoading = false,
  onFilters,
  actions,
}: TeamsListProps) {
  const hasFilters = Boolean(filters.search || filters.status || filters.area);

  return (
    <section>
      <header className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative min-w-52 max-w-xs flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            value={filters.search}
            placeholder="Buscar equipos"
            style="small"
            className="pl-8"
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          style="small"
          onChange={(e) => onFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Estado</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>

        <Select
          value={filters.area}
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

      {isLoading ? (
        <SkeletonCards count={12} />
      ) : teams.length === 0 ? (
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
