import Input from "../../../../shared/components/Input/Input";
import type { ParticipantsPickerState } from "./types";

interface Props {
  picker: ParticipantsPickerState;
}

export default function ProjectParticipantsPicker({ picker }: Props) {
  const {
    areaId,
    source,
    onSourceChange,
    workers,
    teams,
    selectedWorkerIds,
    selectedTeamIds,
    onToggleWorker,
    onToggleTeam,
    search,
    onSearchChange,
  } = picker;

  if (!areaId) {
    return (
      <div className="col-span-2 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-3 text-center text-xs text-neutral-500">
        Selecciona un área operativa para asignar personas o equipos.
      </div>
    );
  }

  const isWorkers = source === "workers";
  const count = isWorkers ? selectedWorkerIds.length : selectedTeamIds.length;

  return (
    <div className="col-span-2 grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-neutral-700 dark:text-neutral-100">
          Asignar integrantes
        </label>
        <span className="text-xs text-neutral-500">
          {count} {isWorkers ? "personas" : "equipos"} seleccionados
        </span>
      </div>

      <div className="flex rounded-md bg-neutral-100 dark:bg-neutral-800 p-0.5">
        <button
          type="button"
          onClick={() => onSourceChange("workers")}
          className={`flex-1 py-1 rounded-md text-xs font-medium cursor-pointer ${
            isWorkers
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
          }`}
        >
          Personas
        </button>
        <button
          type="button"
          onClick={() => onSourceChange("teams")}
          className={`flex-1 py-1 rounded-md text-xs font-medium cursor-pointer ${
            !isWorkers
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
          }`}
        >
          Equipos
        </button>
      </div>

      {isWorkers && (
        <Input
          placeholder="Buscar persona por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      )}

      <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border border-neutral-200 dark:border-neutral-700 p-1">
        {isWorkers ? (
          workers.length === 0 ? (
            <p className="p-2 text-xs text-neutral-400">
              Sin personas disponibles.
            </p>
          ) : (
            workers.map((worker) => (
              <label
                key={worker.id}
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedWorkerIds.includes(worker.id)}
                    onChange={() => onToggleWorker(worker.id)}
                    className="cursor-pointer"
                  />
                  <span>{worker.name}</span>
                </div>
                {worker.project_count > 0 && (
                  <span className="text-xs text-neutral-400">
                    {worker.project_count} proy.
                  </span>
                )}
              </label>
            ))
          )
        ) : teams.length === 0 ? (
          <p className="p-2 text-xs text-neutral-400">
            Sin equipos disponibles.
          </p>
        ) : (
          teams.map((team) => (
            <label
              key={team.id}
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={() => onToggleTeam(team.id)}
                  className="cursor-pointer"
                />
                <span>{team.name}</span>
              </div>
              <span className="text-xs text-neutral-400">
                {team.eligible_count}{" "}
                {team.eligible_count === 1 ? "miembro" : "miembros"}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
