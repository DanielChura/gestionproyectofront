import { Link } from "react-router";
import ChevronDownIcon from "../../shared/icons/ChevronIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import { avatarFor } from "../../shared/avatarUtils";
import { initialColor } from "../../utils/initialColor";
import type { Team } from "../../core/interfaces/organization.interface";
import BuildingIcon from "../../shared/icons/BuildingIcon";
import UserIcon from "../../shared/icons/UserIcon";

interface TeamCardProps {
  team: Team;
  canManage: boolean;
  onAddMember: (team: Team) => void;
}

export default function TeamCard({
  team,
  canManage,
  onAddMember,
}: TeamCardProps) {
  const initials = avatarFor(team.name);

  return (
    <article className="group flex flex-col rounded-2xl border border-neutral-200 transition-colors dark:border-neutral-800">
      <div className="p-2 pb-0">
        <div
          className={`relative flex aspect-square w-full items-center justify-center rounded-xl ${initialColor(team.name)} text-white`}
        >
          <span className="text-4xl  tracking-tight">{initials}</span>
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white p-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-neutral-900">
            <Link
              to={`/equipos/${team.id}`}
              aria-label={`Ver ${team.name}`}
              title="Ver equipo"
              className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ChevronDownIcon className="size-4 -rotate-90" />
            </Link>
            <button
              type="button"
              disabled={!canManage}
              onClick={() => onAddMember(team)}
              aria-label={`Añadir integrante a ${team.name}`}
              title={canManage ? "Añadir integrante" : "Solo administradores"}
              className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 text-neutral-600 dark:text-neutral-200">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 max-w-50 truncate text-xs ">{team.name}</p>
          <span
            title={team.active ? "Activo" : "Inactivo"}
            className={`size-2 shrink-0 rounded-full ${
              team.active ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
        </div>

        <div className="ml-1 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <BuildingIcon className="size-4 shrink-0" fill={false} />
            <span className="truncate">{team.area_name}</span>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon className="size-4 shrink-0" fill={false} />
            <span>
              {team.active_members}{" "}
              {team.active_members === 1 ? "miembro" : "miembros"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
