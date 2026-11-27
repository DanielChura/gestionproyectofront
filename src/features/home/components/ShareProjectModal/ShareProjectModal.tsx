import Modal from "../../../../shared/components/Modal/Modal";
import Input from "../../../../shared/components/Input/Input";
import Button from "../../../../shared/components/Button/Button";
import Avatar from "../../../../shared/Avatar";
import { useShareProjectModal } from "./useShareProjectModal";
import type { Project } from "../../../../core/interfaces/task.interface";

export interface ShareProjectModalProps {
  project: Project;
  onClose: () => void;
  onAddParticipants: (payload: {
    participant_source: "workers" | "teams";
    worker_ids?: number[];
    team_ids?: number[];
  }) => Promise<boolean>;
}

export default function ShareProjectModal({
  project,
  onClose,
  onAddParticipants,
}: ShareProjectModalProps) {
  const {
    search,
    setSearch,
    handleSearchSubmit,
    workersList,
    teamsList,
    handleAddWorker,
    handleAddTeam,
    addingKey,
  } = useShareProjectModal({ project, onAddParticipants });

  return (
    <Modal title="Compartir proyecto" onClose={onClose}>
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-2 border-b border-neutral-200 px-6 py-3 dark:border-neutral-800"
      >
        <div className="min-w-0 flex-1">
          <Input
            placeholder="Buscar colaboradores o equipos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </form>

      <div className="max-h-96 overflow-y-auto px-6 py-4 space-y-4">
        <div className="space-y-1">
          <h4 className="m-0 mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Colaboradores
          </h4>
          {workersList.length === 0 ? (
            <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
              No se encontraron colaboradores disponibles.
            </p>
          ) : (
            workersList.map((worker) => (
              <div
                key={worker.id}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    name={worker.name}
                    className="size-8 rounded-full text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      {worker.name}
                    </p>
                    <p className="m-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {worker.subtitle}
                    </p>
                  </div>
                </div>
                {worker.isAdded ? (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Añadido
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={addingKey === `worker-${worker.id}`}
                    onClick={() => void handleAddWorker(worker.id)}
                  >
                    {addingKey === `worker-${worker.id}`
                      ? "Añadiendo…"
                      : "Añadir"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800 space-y-1">
          <h4 className="m-0 mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Equipos de trabajo
          </h4>
          {teamsList.length === 0 ? (
            <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
              No se encontraron equipos disponibles.
            </p>
          ) : (
            teamsList.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {team.name.trim().charAt(0).toUpperCase() || "E"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-xs font-medium text-neutral-800 dark:text-neutral-100">
                      {team.name}
                    </p>
                    <p className="m-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {team.memberCount} integrantes disponibles
                    </p>
                  </div>
                </div>
                {team.isAdded ? (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Añadido
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={addingKey === `team-${team.id}`}
                    onClick={() => void handleAddTeam(team.id)}
                  >
                    {addingKey === `team-${team.id}`
                      ? "Añadiendo…"
                      : "Añadir"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
