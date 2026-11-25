import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
import PlusIcon from "../../shared/icons/PlusIcon";
import Button from "../../shared/components/Button/Button";
import SectionHeader from "../layout/SectionHeader/SectionHeader";
import WorkerForm from "./WorkerForm/WorkerForm";
import TeamForm from "../organization/teams/TeamForm/TeamForm";
import type { TeamFormState } from "../organization/teams/TeamForm/useTeamForm";
import TeamMembersModal from "../organization/teams/TeamMembersModal";
import { useAuth } from "../../hooks/useAuth";
import { usePeople } from "./usePeople";
import TeamsList from "./TeamsList";
import WorkersList from "./WorkersList";
import type { Worker } from "../../core/interfaces/worker.interface";

const emptyTeam: TeamFormState = { area: "", name: "", active: false };

const emptyWorker: Worker = {
  id: 0,
  area: null,
  code: "",
  first_names: "",
  last_names: "",
  email: "",
  weekly_hours: "40.00",
  active: true,
  all_areas: false,
  specialties: [],
};

interface TeamsPageProps {
  canManage?: boolean;
}

export default function TeamsPage({
  canManage: propCanManage,
}: TeamsPageProps) {
  const { isAdmin } = useAuth();
  const canManage = propCanManage ?? isAdmin;
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeams = pathname === "/equipos" || pathname === "/equipos/todos";
  const people = usePeople();
  const { setCreatingTeam } = people;

  useEffect(() => {
    if (searchParams.get("nuevo") !== "equipo") return;
    setCreatingTeam(true);
    const next = new URLSearchParams(searchParams);
    next.delete("nuevo");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, setCreatingTeam]);

  const handleOpenCreate = () => {
    if (isTeams) {
      setCreatingTeam(true);
      return;
    }
    people.setEditingWorker({
      ...emptyWorker,
      area: people.areas[0]?.id ?? null,
    });
  };

  return (
    <main
      id="main-content"
      className="min-h-full text-neutral-700 dark:text-neutral-100"
    >
      <SectionHeader
        title={isTeams ? "Todos los equipos" : "Todos los trabajadores"}
        action={
          <Button
            type="button"
            disabled={!canManage}
            title={
              !canManage
                ? "Solo los administradores pueden realizar esta acción"
                : undefined
            }
            onClick={handleOpenCreate}
          >
            <PlusIcon className="size-4" />
            {isTeams ? "Nuevo equipo" : "Nuevo trabajador"}
          </Button>
        }
      />

      {isTeams ? (
        <TeamsList
          teams={people.visibleTeams}
          total={people.teams.length}
          areas={people.areas}
          filters={people.teamFilters}
          isLoading={people.isLoading}
          onFilters={people.setTeamFilters}
          actions={{
            canManage,
            onAddMember: people.setMemberTeam,
            onEdit: people.setEditingTeam,
          }}
        />
      ) : (
        <WorkersList
          workers={people.visibleWorkers}
          total={people.workers.length}
          areas={people.areas}
          filters={people.workerFilters}
          isLoading={people.isLoading}
          onFilters={people.setWorkerFilters}
          actions={{
            canManage,
            areaNameById: people.areaNameById,
            onEdit: people.setEditingWorker,
          }}
        />
      )}

      {people.editingWorker != null && (
        <WorkerForm
          key={people.editingWorker.id}
          worker={people.editingWorker}
          areas={people.areas}
          submitting={people.savingWorker}
          onClose={() => people.setEditingWorker(null)}
          onSubmit={people.saveWorker}
        />
      )}

      {(people.creatingTeam || people.editingTeam) && (
        <TeamForm
          key={people.editingTeam?.id ?? "nuevo"}
          title={people.editingTeam ? "Editar equipo" : "Nuevo equipo"}
          submitLabel={people.editingTeam ? "Guardar" : "Crear"}
          initialData={
            people.editingTeam
              ? {
                  area: String(people.editingTeam.area),
                  name: people.editingTeam.name,
                  active: people.editingTeam.active,
                }
              : emptyTeam
          }
          areas={people.areas}
          submitting={people.savingTeam}
          onClose={() => {
            people.setCreatingTeam(false);
            people.setEditingTeam(null);
          }}
          onSubmit={people.saveTeam}
        />
      )}

      {people.memberTeam != null && (
        <TeamMembersModal
          team={people.memberTeam}
          onClose={() => people.setMemberTeam(null)}
          onChanged={people.refreshTeams}
        />
      )}
    </main>
  );
}
