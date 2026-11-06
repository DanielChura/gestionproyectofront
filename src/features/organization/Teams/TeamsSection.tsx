import { useState } from "react";
import TeamsIcon from "../../../shared/Icons/TeamsIcon";
import EditIcon from "../../../shared/Icons/EditIcon";
import TrashIcon from "../../../shared/Icons/TrashIcon";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import Button from "../../../shared/Button/Button";
import EmptyState from "../../../shared/EmptyState/EmptyState";
import {
  createTeam,
  removeTeam,
  updateTeam,
} from "../../../core/services/organizationService";
import type {
  Team,
  TeamWriteData,
} from "../../../core/interfaces/organization.interface";
import { useTeams } from "./useTeams";
import { useAreas } from "../Area/useAreas";
import type { TeamFormState } from "./TeamForm/useTeamForm";
import TeamForm from "./TeamForm/TeamForm";
import TeamMembersModal from "./TeamMembersModal";

type TeamModal = { mode: "create" } | { mode: "edit"; team: Team };

const emptyTeam: TeamFormState = { area: "", name: "", active: true };

function TeamsSection() {
  const { data, refetch } = useTeams();
  const { data: areas } = useAreas();
  const [modal, setModal] = useState<TeamModal | null>(null);
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: TeamWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateTeam(modal.team.id, formData);
      } else {
        await createTeam(formData);
      }
      refetch();
      setModal(null);
    } catch (e) {
      console.error("Error saving team:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`¿Eliminar el equipo ${team.name}?`)) return;
    try {
      await removeTeam(team.id);
      refetch();
    } catch (e) {
      console.error("Error deleting team:", e);
    }
  };

  return (
    <section aria-label="Equipos" className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">
          Equipos
        </h3>
        <Button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nuevo equipo"
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" />
          <span>Nuevo equipo</span>
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState iconName="teams" message="No hay equipos registrados." />
      ) : (
        <ul className="m-0 p-0 list-none space-y-0.5">
          {data.map((team) => (
            <li
              key={team.id}
              className="px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center" aria-hidden="true">
                  <TeamsIcon className="size-4" />
                </span>
                <span className="text-neutral-800 dark:text-neutral-100 truncate">
                  {team.name}
                </span>
                <span className="px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded ">
                  {team.area_name}
                </span>
                <span className="px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded ">
                  {team.active_members} miembros
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                  onClick={() => setMembersTeam(team)}
                  aria-label={`Miembros de ${team.name}`}
                >
                  <PlusIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                  onClick={() => setModal({ mode: "edit", team })}
                  aria-label={`Editar ${team.name}`}
                >
                  <EditIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                  onClick={() => handleDelete(team)}
                  aria-label={`Eliminar ${team.name}`}
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal != null && (
        <TeamForm
          key={modal.mode === "edit" ? modal.team.id : "new"}
          title={modal.mode === "edit" ? "Editar equipo" : "Nuevo equipo"}
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit"
              ? {
                  area: String(modal.team.area),
                  name: modal.team.name,
                  active: modal.team.active,
                }
              : emptyTeam
          }
          areas={areas}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {membersTeam != null && (
        <TeamMembersModal
          key={membersTeam.id}
          team={membersTeam}
          onClose={() => setMembersTeam(null)}
          onChanged={refetch}
        />
      )}
    </section>
  );
}

export default TeamsSection;
