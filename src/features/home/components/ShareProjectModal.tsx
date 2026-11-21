import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";
import {
  getProjectTeamCandidates,
  getWorkerCandidates,
} from "../../../core/services/projectService";
import type {
  Project,
  TeamOption,
  WorkerCandidate,
} from "../../../core/interfaces/task.interface";

interface ShareProjectModalProps {
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
  const [source, setSource] = useState<"workers" | "teams">("workers");
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const areaId = project.areas?.[0]?.id ?? 0;
  const currentMemberIds = new Set(project.participants.map((p) => p.id));

  const { data: rawWorkers = [] } = useQuery<WorkerCandidate[]>({
    queryKey: ["workerCandidates", areaId, search],
    queryFn: () => getWorkerCandidates(areaId ? [areaId] : [], search),
    enabled: Boolean(areaId) && source === "workers",
  });

  const { data: teams = [] } = useQuery<TeamOption[]>({
    queryKey: ["teamCandidates", areaId],
    queryFn: () =>
      areaId ? getProjectTeamCandidates(areaId) : Promise.resolve([]),
    enabled: Boolean(areaId) && source === "teams",
  });

  const availableWorkers = rawWorkers.filter(
    (w) => !currentMemberIds.has(w.id),
  );

  const toggleWorker = (id: number) =>
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const toggleTeam = (id: number) =>
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await onAddParticipants({
      participant_source: source,
      worker_ids: source === "workers" ? selectedWorkers : [],
      team_ids: source === "teams" ? selectedTeams : [],
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  const isWorkers = source === "workers";

  return (
    <Form
      title="Compartir proyecto"
      submitLabel="Añadir integrantes"
      size="md"
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-2 flex rounded-md bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => {
            setSource("workers");
            setSelectedTeams([]);
          }}
          className={`flex-1 py-1 rounded-md font-medium cursor-pointer ${isWorkers ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`}
        >
          Personas
        </button>
        <button
          type="button"
          onClick={() => {
            setSource("teams");
            setSelectedWorkers([]);
          }}
          className={`flex-1 py-1 rounded-md font-medium cursor-pointer ${!isWorkers ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`}
        >
          Equipos
        </button>
      </div>

      {isWorkers && (
        <div className="col-span-2">
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="col-span-2 max-h-48 overflow-y-auto space-y-1 rounded-md border border-neutral-200 dark:border-neutral-700 p-1">
        {isWorkers ? (
          availableWorkers.length === 0 ? (
            <p className="p-2 text-xs text-neutral-400">
              Sin personas adicionales disponibles.
            </p>
          ) : (
            availableWorkers.map((w) => (
              <label
                key={w.id}
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(w.id)}
                    onChange={() => toggleWorker(w.id)}
                    className="cursor-pointer"
                  />
                  <span>{w.name}</span>
                </div>
              </label>
            ))
          )
        ) : teams.length === 0 ? (
          <p className="p-2 text-xs text-neutral-400">
            Sin equipos disponibles.
          </p>
        ) : (
          teams.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(t.id)}
                  onChange={() => toggleTeam(t.id)}
                  className="cursor-pointer"
                />
                <span>{t.name}</span>
              </div>
              <span className="text-xs text-neutral-400">
                {t.eligible_count} miembros
              </span>
            </label>
          ))
        )}
      </div>
    </Form>
  );
}
