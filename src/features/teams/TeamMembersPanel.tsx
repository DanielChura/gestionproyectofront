import { useState } from "react";
import EmptyState from "../../shared/states/EmptyState/EmptyState";
import EmptyFilters from "../../shared/states/EmptyFilters/EmptyFilters";
import Input from "../../shared/components/Input/Input";
import Select from "../../shared/components/Select/Select";
import SearchIcon from "../../shared/icons/SearchIcon";
import TeamMemberCard from "./TeamMemberCard";
import type { TeamMember } from "../../core/interfaces/organization.interface";

interface TeamMembersPanelProps {
  members: TeamMember[];
  canManage: boolean;
  busy: boolean;
  onRemove: (memberId: number) => void;
}

export default function TeamMembersPanel({
  members,
  canManage,
  busy,
  onRemove,
}: TeamMembersPanelProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = search.trim().toLocaleLowerCase("es");

  const visible = members.filter(
    (member) =>
      (query === "" ||
        member.worker_name.toLocaleLowerCase("es").includes(query)) &&
      (status === "" ||
        (status === "activo"
          ? member.left_date == null
          : member.left_date != null)),
  );

  return (
    <section aria-label="Integrantes">
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <h2 className="m-0 mr-auto text-sm text-neutral-800 dark:text-neutral-100">
          Integrantes{" "}
          <span className=" text-neutral-500 dark:text-neutral-400">
            ({visible.length})
          </span>
        </h2>
        <div className="relative min-w-48 max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            value={search}
            placeholder="Buscar por nombre"
            aria-label="Buscar integrantes"
            style="small"
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          aria-label="Filtrar por estado"
          style="small"
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Estado</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        query !== "" || status !== "" ? (
          <EmptyFilters />
        ) : (
          <EmptyState
            iconName="teams"
            message="Este equipo no tiene integrantes."
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visible.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              canManage={canManage}
              busy={busy}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
