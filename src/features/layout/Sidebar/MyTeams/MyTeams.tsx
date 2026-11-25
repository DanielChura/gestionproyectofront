import { Link } from "react-router";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import NavEmptyState from "../../../../shared/states/NavEmptyState/NavEmptyState";
import TeamsIcon from "../../../../shared/icons/TeamsIcon";
import { useMyTeams } from "../../../teams/useMyTeams";

interface MyTeamsProps {
  activeTeamId?: number;
}

export default function MyTeams({ activeTeamId }: MyTeamsProps) {
  const { teams, isLoading } = useMyTeams();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 px-1 py-1" aria-busy="true">
        <SkeletonTheme
          baseColor="var(--skeleton-base)"
          highlightColor="var(--skeleton-highlight)"
          enableAnimation={false}
        >
          <Skeleton height={28} count={2} className="rounded-md" />
        </SkeletonTheme>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <NavEmptyState
        iconName="teams"
        title="Cuando te añadan a un equipo, lo verás aquí."
        color="#f59e0b"
      />
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {teams.map((team) => {
        const active = activeTeamId === team.id;
        return (
          <li key={team.id}>
            <Link
              to={`/equipos/${team.id}`}
              aria-current={active ? "page" : undefined}
              className={`badge flex items-center gap-2 ${
                active
                  ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  : ""
              }`}
            >
              <TeamsIcon className="size-4 shrink-0" fill={false} />
              <span className="min-w-0 flex-1 truncate">{team.name}</span>
              {team.active_members !== undefined && (
                <span className="text-xs text-neutral-400">
                  {team.active_members}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
