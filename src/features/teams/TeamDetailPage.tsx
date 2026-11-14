import { useState } from "react";
import { Link, useParams } from "react-router";
import NotAvailable from "../layout/NotAvailable/NotAvailable";
import Button from "../../shared/components/Button/Button";
import PlusIcon from "../../shared/icons/PlusIcon";
import BuildingIcon from "../../shared/icons/BuildingIcon";
import UserIcon from "../../shared/icons/UserIcon";
import ChevronDownIcon from "../../shared/icons/ChevronIcon";
import Avatar from "../../shared/Avatar";
import TeamMembersModal from "../organizations/Teams/TeamMembersModal";
import { useTeamDetail } from "../organizations/Teams/useTeamDetail";
import TeamMembersPanel from "./TeamMembersPanel";

interface TeamDetailPageProps {
  canManage?: boolean;
}

export default function TeamDetailPage({
  canManage = false,
}: TeamDetailPageProps) {
  const { teamId } = useParams();
  const [adding, setAdding] = useState(false);
  const { team, members, removing, refetch, removeMember } = useTeamDetail(
    Number(teamId),
  );

  if (team == null) return <NotAvailable />;

  return (
    <main
      id="main-content"
      className="min-h-full text-neutral-800 dark:text-neutral-100"
    >
      <header className="-mx-4 -mt-4 mb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to="/equipos"
              aria-label="Volver a equipos"
              title="Volver a equipos"
              className="cursor-pointer rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ChevronDownIcon className="size-4 rotate-90" />
            </Link>
            <Avatar name={team.name} className="size-8 rounded-lg text-xs" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 truncate text-sm  text-neutral-800 dark:text-neutral-100">
                  {team.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs  ${
                    team.active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      team.active ? "bg-emerald-500" : "bg-neutral-400"
                    }`}
                  />
                  {team.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="m-0 mt-0.5 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-200">
                <BuildingIcon className="size-3.5 shrink-0" fill={false} />
                {team.area_name}
                <span aria-hidden="true">·</span>
                <UserIcon className="size-3.5 shrink-0" fill={false} />
                {members.length}{" "}
                {members.length === 1 ? "integrante" : "integrantes"}
              </p>
            </div>
          </div>
          <span
            title={canManage ? undefined : "Solo administradores"}
            className="inline-flex"
          >
            <Button
              type="button"
              disabled={!canManage}
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5"
            >
              <PlusIcon className="size-4" />
              Añadir integrante
            </Button>
          </span>
        </div>
      </header>

      <TeamMembersPanel
        members={members}
        canManage={canManage}
        busy={removing}
        onRemove={(memberId) => void removeMember(memberId)}
      />

      {adding && (
        <TeamMembersModal
          team={team}
          onClose={() => setAdding(false)}
          onChanged={() => void refetch()}
        />
      )}
    </main>
  );
}
