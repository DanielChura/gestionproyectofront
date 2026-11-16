import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTeam,
  listAreas,
  listTeams,
  updateTeam,
} from "../../core/services/organizationService";
import { listWorkers, updateWorker } from "../../core/services/workerService";
import type { Area, Team, TeamWriteData } from "../../core/interfaces/organization.interface";
import type { TeamFilters, WorkerListFilters } from "./types";
import type {
  Worker,
  WorkerUpdateData,
} from "../../core/interfaces/worker.interface";
import { useToast } from "../../hooks/useToast";
import { errorText } from "../auth/api";

export function usePeople() {
  const [workerFilters, setWorkerFilters] = useState<WorkerListFilters>({
    search: "",
    status: "",
    area: "",
    sort: "asc",
  });
  const [teamFilters, setTeamFilters] = useState<TeamFilters>({
    search: "",
    status: "",
    area: "",
    sort: "asc",
  });
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [memberTeam, setMemberTeam] = useState<Team | null>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: () => listWorkers(),
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: listTeams,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: listAreas,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const workerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkerUpdateData }) =>
      updateWorker(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workers"] });
      setEditingWorker(null);
      addToast({
        icon: "success",
        title: "Trabajador actualizado",
        message: "Los datos del trabajador se guardaron correctamente.",
      });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo actualizar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  const teamMutation = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: TeamWriteData }) =>
      id ? updateTeam(id, data) : createTeam(data),
    onSuccess: async (_team, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreatingTeam(false);
      setEditingTeam(null);
      addToast({
        icon: "success",
        title: variables.id ? "Equipo actualizado" : "Equipo creado",
        message: variables.id
          ? "Los datos del equipo se guardaron correctamente."
          : "El equipo se registró correctamente.",
      });
    },
    onError: (error, variables) => {
      addToast({
        icon: "error",
        title: variables.id
          ? "No se pudo actualizar el equipo"
          : "No se pudo crear el equipo",
        message: errorText(error),
      });
    },
  });

  const areaNameById = useMemo(
    () => new Map(areas.map((area) => [area.id, area.name])),
    [areas],
  );

  const visibleWorkers = useMemo(() => {
    const query = workerFilters.search.trim().toLocaleLowerCase("es");
    return workers
      .filter((worker) => {
        const area =
          worker.area != null ? (areaNameById.get(worker.area) ?? "") : "";
        return (
          (workerFilters.area === "" ||
            worker.area === Number(workerFilters.area)) &&
          (workerFilters.status === "" ||
            worker.active === (workerFilters.status === "true")) &&
          (query === "" ||
            `${worker.first_names} ${worker.last_names} ${worker.code} ${worker.email} ${area}`
              .toLocaleLowerCase("es")
              .includes(query))
        );
      })
      .sort(
        (a, b) =>
          `${a.first_names} ${a.last_names}`.localeCompare(
            `${b.first_names} ${b.last_names}`,
            "es",
          ) * (workerFilters.sort === "desc" ? -1 : 1),
      );
  }, [workers, workerFilters, areaNameById]);

  const visibleTeams = useMemo(() => {
    const query = teamFilters.search.trim().toLocaleLowerCase("es");
    return teams
      .filter(
        (team) =>
          (teamFilters.area === "" ||
            team.area === Number(teamFilters.area)) &&
          (query === "" ||
            team.name.toLocaleLowerCase("es").includes(query) ||
            team.area_name.toLocaleLowerCase("es").includes(query)) &&
          (teamFilters.status === "" ||
            team.active === (teamFilters.status === "true")),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "es") *
          (teamFilters.sort === "desc" ? -1 : 1),
      );
  }, [teams, teamFilters]);

  const saveWorker = (data: WorkerUpdateData) => {
    if (editingWorker == null) return;
    workerMutation.mutate({ id: editingWorker.id, data });
  };

  const saveTeam = (data: TeamWriteData) => {
    teamMutation.mutate({ id: editingTeam?.id, data });
  };

  const refreshTeams = () => {
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  return {
    workers,
    visibleWorkers,
    areaNameById,
    workerFilters,
    setWorkerFilters,
    teamFilters,
    setTeamFilters,
    teams,
    visibleTeams,
    areas,
    editingWorker,
    setEditingWorker,
    creatingTeam,
    setCreatingTeam,
    editingTeam,
    setEditingTeam,
    memberTeam,
    setMemberTeam,
    refreshTeams,
    savingWorker: workerMutation.isPending,
    savingTeam: teamMutation.isPending,
    saveWorker,
    saveTeam,
  };
}
