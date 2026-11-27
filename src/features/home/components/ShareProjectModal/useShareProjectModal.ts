import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProjectTeamCandidates,
  getWorkerCandidates,
} from "../../../../core/services/projectService";
import type {
  Project,
  TeamOption,
  WorkerCandidate,
} from "../../../../core/interfaces/task.interface";

export interface DisplayWorker {
  id: number;
  name: string;
  isAdded: boolean;
  subtitle: string;
}

export interface DisplayTeam {
  id: number;
  name: string;
  isAdded: boolean;
  memberCount: number;
}

interface UseShareProjectModalOptions {
  project: Project;
  onAddParticipants: (payload: {
    participant_source: "workers" | "teams";
    worker_ids?: number[];
    team_ids?: number[];
  }) => Promise<boolean>;
}

export function useShareProjectModal({
  project,
  onAddParticipants,
}: UseShareProjectModalOptions) {
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const areaId = project.areas?.[0]?.id ?? 0;
  const currentMemberIds = useMemo(
    () => new Set(project.participants.map((p) => p.id)),
    [project.participants],
  );
  const currentTeamIds = useMemo(
    () => new Set((project.assignment_teams ?? []).map((t) => t.id)),
    [project.assignment_teams],
  );

  const { data: rawWorkers = [], isLoading: isLoadingWorkers } = useQuery<
    WorkerCandidate[]
  >({
    queryKey: ["workerCandidates", areaId, querySearch],
    queryFn: () => getWorkerCandidates(areaId ? [areaId] : [], querySearch),
    enabled: Boolean(areaId),
  });

  const { data: rawTeams = [], isLoading: isLoadingTeams } = useQuery<
    TeamOption[]
  >({
    queryKey: ["teamCandidates", areaId],
    queryFn: () =>
      areaId ? getProjectTeamCandidates(areaId) : Promise.resolve([]),
    enabled: Boolean(areaId),
  });

  const workersList = useMemo<DisplayWorker[]>(() => {
    const term = search.trim().toLowerCase();

    const existing: DisplayWorker[] = project.participants
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .map((p) => ({
        id: p.id,
        name: p.name,
        isAdded: true,
        subtitle:
          p.role === "RESPONSABLE"
            ? "Responsable"
            : p.role === "REVISOR"
              ? "Revisor"
              : "Colaborador",
      }));

    const candidates: DisplayWorker[] = rawWorkers
      .filter(
        (w) =>
          !currentMemberIds.has(w.id) &&
          (!term || w.name.toLowerCase().includes(term)),
      )
      .map((w) => ({
        id: w.id,
        name: w.name,
        isAdded: false,
        subtitle:
          w.project_count > 0
            ? `${w.project_count} proyectos asignados`
            : "Disponible para asignación",
      }));

    return [...existing, ...candidates];
  }, [project.participants, rawWorkers, currentMemberIds, search]);

  const teamsList = useMemo<DisplayTeam[]>(() => {
    const term = search.trim().toLowerCase();
    return rawTeams
      .filter((t) => !term || t.name.toLowerCase().includes(term))
      .map((t) => ({
        id: t.id,
        name: t.name,
        isAdded: currentTeamIds.has(t.id),
        memberCount: t.eligible_count,
      }));
  }, [rawTeams, currentTeamIds, search]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuerySearch(search.trim());
  };

  const handleAddWorker = async (id: number) => {
    const key = `worker-${id}`;
    if (addingKey) return;
    setAddingKey(key);
    await onAddParticipants({
      participant_source: "workers",
      worker_ids: [id],
    });
    setAddingKey(null);
  };

  const handleAddTeam = async (id: number) => {
    const key = `team-${id}`;
    if (addingKey) return;
    setAddingKey(key);
    await onAddParticipants({
      participant_source: "teams",
      team_ids: [id],
    });
    setAddingKey(null);
  };

  return {
    search,
    setSearch,
    handleSearchSubmit,
    workersList,
    teamsList,
    handleAddWorker,
    handleAddTeam,
    addingKey,
    isLoading: isLoadingWorkers || isLoadingTeams,
  };
}
