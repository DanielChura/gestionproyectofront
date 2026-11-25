import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ParticipantSource, ParticipantsPickerState } from "./types";
import { useToast } from "../../../../hooks/useToast";
import { listAreas } from "../../../../core/services/organizationService";
import {
  createProject,
  getProject,
  getProjectTeamCandidates,
  getWorkerCandidates,
} from "../../../home/services";
import type {
  CreateProjectPayload,
  TeamOption,
  WorkerCandidate,
} from "../../../home/types";
import { updateProject } from "../../../../core/services/projectService";
import type { Area } from "../../../../core/interfaces/organization.interface";

export function useCreateProject(projectId?: number, onClose?: () => void) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState("");
  const [participantSource, setParticipantSource] =
    useState<ParticipantSource>("workers");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const isEditing = Boolean(projectId);

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: listAreas,
    select: (data) =>
      Array.isArray(data) ? data.filter((area) => area.active) : [],
  });

  const { data: workerCandidates = [] } = useQuery<WorkerCandidate[]>({
    queryKey: ["workerCandidates", areaId, workerSearch],
    queryFn: () => getWorkerCandidates(areaId ? [areaId] : [], workerSearch),
    enabled: Boolean(areaId) && participantSource === "workers",
  });

  const { data: teamCandidates = [] } = useQuery<TeamOption[]>({
    queryKey: ["teamCandidates", areaId],
    queryFn: () =>
      areaId ? getProjectTeamCandidates(areaId) : Promise.resolve([]),
    enabled: Boolean(areaId) && participantSource === "teams",
  });

  useEffect(() => {
    if (!projectId) return;
    let active = true;

    queryClient
      .fetchQuery({
        queryKey: ["project", projectId],
        queryFn: () => getProject(projectId),
      })
      .then((project) => {
        if (!active) return;
        setName(project.name);
        setDescription(project.description || "");
        setAreaId(project.areas?.[0]?.id ?? null);
        setEndDate(project.end_date ? project.end_date.slice(0, 10) : "");
      })
      .catch(() => {
        if (!active) return;
        addToast({
          icon: "error",
          title: "No se pudo cargar el proyecto",
          message: "No se pudo cargar el proyecto a editar.",
        });
      });

    return () => {
      active = false;
    };
  }, [projectId, queryClient, addToast]);

  const handleAreaChange = (newAreaId: number | null) => {
    setAreaId(newAreaId);
    setSelectedWorkerIds([]);
    setSelectedTeamIds([]);
    setWorkerSearch("");
  };

  const handleSourceChange = (newSource: ParticipantSource) => {
    setParticipantSource(newSource);
    setSelectedWorkerIds([]);
    setSelectedTeamIds([]);
  };

  const toggleWorker = (id: number) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleTeam = (id: number) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => {
      if (isEditing && projectId) {
        return updateProject(projectId, {
          name: payload.name,
          description: payload.description,
          mode: payload.mode,
          area_ids: payload.area_ids,
          end_date: payload.end_date,
        });
      }
      return createProject(payload);
    },
    onSuccess: async (project, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["project", project.id] }),
      ]);
      addToast({
        icon: "success",
        title: isEditing ? "Proyecto actualizado" : "Proyecto creado",
        message: isEditing
          ? `Los cambios en "${payload.name}" fueron guardados.`
          : `El proyecto "${project.name}" se creó correctamente.`,
      });
      onClose?.();
      navigate(`/proyectos/${project.id}`);
    },
    onError: () => {
      addToast({
        icon: "error",
        title: isEditing
          ? "No se pudo actualizar el proyecto"
          : "No se pudo crear el proyecto",
        message: "No fue posible procesar el proyecto.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || saveMutation.isPending) return;

    if (!areaId) {
      addToast({
        icon: "error",
        title: "Área requerida",
        message: "Por favor selecciona un área operativa para el proyecto.",
      });
      return;
    }

    const hasParticipants =
      participantSource === "workers"
        ? selectedWorkerIds.length > 0
        : selectedTeamIds.length > 0;

    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      area_ids: [areaId],
      end_date: endDate ? endDate : null,
      mode: hasParticipants ? "assigned" : "available",
      participant_source: participantSource,
      worker_ids: participantSource === "workers" ? selectedWorkerIds : [],
      team_ids: participantSource === "teams" ? selectedTeamIds : [],
      worker_contribute: false,
    });
  };

  const picker: ParticipantsPickerState = {
    areaId,
    source: participantSource,
    onSourceChange: handleSourceChange,
    workers: workerCandidates,
    teams: teamCandidates,
    selectedWorkerIds,
    selectedTeamIds,
    onToggleWorker: toggleWorker,
    onToggleTeam: toggleTeam,
    search: workerSearch,
    onSearchChange: setWorkerSearch,
  };

  return {
    name,
    setName,
    description,
    setDescription,
    areaId,
    handleAreaChange,
    endDate,
    setEndDate,
    areas,
    submitting: saveMutation.isPending,
    isEditing,
    handleSubmit,
    picker,
  };
}
