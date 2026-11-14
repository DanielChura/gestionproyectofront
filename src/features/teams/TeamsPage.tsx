import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
import PlusIcon from "../../shared/icons/PlusIcon";
import Button from "../../shared/components/Button/Button";
import WorkerForm from "./WorkerForm/WorkerForm";
import TeamForm from "../organizations/Teams/TeamForm/TeamForm";
import type { TeamFormState } from "../organizations/Teams/TeamForm/useTeamForm";
import TeamMembersModal from "../organizations/Teams/TeamMembersModal";
import { usePeople } from "./usePeople";
import WorkersGrid from "./WorkersGrid";
import TeamsGrid from "./TeamsGrid";
import type { Worker } from "../../core/interfaces/worker.interface";

const emptyTeam: TeamFormState = { area: "", name: "", active: true };

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

export default function TeamsPage({ canManage = false }: TeamsPageProps) {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeams = pathname === "/equipos" || pathname === "/equipos/todos";
  const people = usePeople();

  useEffect(() => {
    if (searchParams.get("nuevo") !== "equipo") return;
    people.setCreatingTeam(true);
    const next = new URLSearchParams(searchParams);
    next.delete("nuevo");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, people.setCreatingTeam]);

  const handleOpenCreate = () => {
    if (isTeams) {
      people.setCreatingTeam(true);
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
      className="min-h-full text-neutral-800 dark:text-neutral-100"
    >
      <header className="-mx-4 -mt-4 mb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="m-0 text-sm  text-neutral-800 dark:text-neutral-100">
            {isTeams ? "Todos los equipos" : "Todos los trabajadores"}
          </h1>
          <span
            title={canManage ? undefined : "Solo administradores"}
            className="inline-flex"
          >
            <Button
              type="button"
              disabled={!canManage}
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5"
            >
              <PlusIcon className="size-4" />
              {isTeams ? "Nuevo equipo" : "Nuevo trabajador"}
            </Button>
          </span>
        </div>
      </header>

      {isTeams ? (
        <TeamsGrid
          teams={people.visibleTeams}
          total={people.teams.length}
          areas={people.areas}
          filters={people.teamFilters}
          onFilters={people.setTeamFilters}
          actions={{ canManage, onAddMember: people.setMemberTeam }}
        />
      ) : (
        <WorkersGrid
          workers={people.visibleWorkers}
          total={people.workers.length}
          areas={people.areas}
          filters={people.workerFilters}
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

      {people.creatingTeam && (
        <TeamForm
          title="Nuevo equipo"
          submitLabel="Crear"
          initialData={emptyTeam}
          areas={people.areas}
          submitting={people.savingTeam}
          onClose={() => people.setCreatingTeam(false)}
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
