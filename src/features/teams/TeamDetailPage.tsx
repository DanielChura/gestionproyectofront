import { useState } from "react";
import { useParams } from "react-router";
import NotAvailable from "../layout/NotAvailable/NotAvailable";
import EmptyState from "../../shared/EmptyState/EmptyState";
import { avatarFor } from "../../shared/Avatar";
import ActivityIcon from "../../shared/icons/ActivityIcon";
import ClockIcon from "../../shared/icons/ClockIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import Button from "../../shared/Button/Button";
import Input from "../../shared/Input/Input";
import Select from "../../shared/Select/Select";
import SearchIcon from "../../shared/icons/SearchIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import UserIcon from "../../shared/icons/UserIcon";
import TeamMembersModal from "../organization/Teams/TeamMembersModal";
import { useTeamDetail } from "../organization/Teams/useTeamDetail";

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { team, members, refetch, removeMember } = useTeamDetail(
    Number(teamId),
  );

  if (team == null) return <NotAvailable />;

  const query = search.trim().toLowerCase();
  const visible = members.filter(
    (m) =>
      (query === "" || m.worker_name.toLowerCase().includes(query)) &&
      (status === "" ||
        (status === "activo" ? m.left_date == null : m.left_date != null)),
  );

  const handleRemove = async (memberId: number) => {
    await removeMember(memberId);
  };

  return (
    <main className="min-h-full text-neutral-800 dark:text-neutral-100">
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg  text-neutral-800 dark:text-neutral-100">
            {team.name}
          </h1>
          <span
            className={`text-xs  ${team.active ? "text-green-500" : "text-red-600"}`}
          >
            {team.active ? "Activo" : "Inactivo"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          {team.area_name} · {members.length}{" "}
          {members.length === 1 ? "integrante" : "integrantes"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h2 className="mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Integrantes{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
            ({visible.length})
          </span>
        </h2>
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="search"
            value={search}
            placeholder="Buscar por nombre"
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-8"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </Select>
        <Button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" />
          Añadir integrante
        </Button>
      </div>

      <section className="border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
        {visible.length === 0 ? (
          <EmptyState
            iconName="teams"
            message={
              query !== "" || status !== ""
                ? "Sin resultados para los filtros aplicados."
                : "Este equipo no tiene integrantes."
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-xs text-neutral-600 dark:text-neutral-400 text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800  text-neutral-700 dark:text-neutral-300">
                <tr>
                  <th className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <UserIcon className="size-4" />
                      Integrante
                    </span>
                  </th>
                  <th className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="size-4" />
                      Ingreso
                    </span>
                  </th>
                  <th className="p-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <ActivityIcon className="size-4" />
                      Estado
                    </span>
                  </th>
                  <th className="p-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <DotsIcon className="size-4" />
                      Acciones
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => {
                  const isActive = member.left_date == null;
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="size-7 flex-none inline-flex items-center justify-center rounded-full bg-sky-500 text-[10px]  text-neutral-100"
                          >
                            {avatarFor(member.worker_name)}
                          </span>
                          <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-100">
                            {member.worker_name}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2">{member.joined_date}</td>
                      <td
                        className={`px-3 py-2 text-center  ${isActive ? "text-green-500" : "text-red-600"}`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => void handleRemove(member.id)}
                          aria-label={`Quitar a ${member.worker_name}`}
                          className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
