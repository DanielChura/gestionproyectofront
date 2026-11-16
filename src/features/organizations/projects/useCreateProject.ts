import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  getProject,
  updateProject,
} from "../../../core/services/projectService";
import { listAreas } from "../../../core/services/organizationService";
import type { Area } from "../../../core/interfaces/organization.interface";
import type {
  CreateProjectPayload,
  ProjectMode,
} from "../../../core/interfaces/task.interface";
import { useToast } from "../../../hooks/useToast";

export function useCreateProject(projectId?: number) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<ProjectMode>("available");
  const [areaIds, setAreaIds] = useState<number[]>([]);
  const [endDate, setEndDate] = useState("");
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
        setMode(project.available ? "available" : "assigned");
        setAreaIds(project.areas?.map((area) => area.id) ?? []);
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

  const toggleArea = (id: number) => {
    setAreaIds((prev) =>
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

    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      mode,
      area_ids: areaIds,
      end_date: endDate ? endDate : null,
      worker_ids: [],
      worker_contribute: false,
    });
  };

  return {
    name,
    setName,
    description,
    setDescription,
    mode,
    setMode,
    areaIds,
    toggleArea,
    endDate,
    setEndDate,
    areas,
    submitting: saveMutation.isPending,
    isEditing,
    handleSubmit,
  };
}
