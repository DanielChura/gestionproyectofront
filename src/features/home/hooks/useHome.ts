import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "./useProjects";
import { useProjectTasks } from "./useProjectTasks";
import { createTask } from "../../../core/services/taskService";
import { createPublication } from "../../../core/services/publicationService";
import { useToast } from "../../../hooks/useToast";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import type { Task } from "../../../core/interfaces/task.interface";

export function useHome() {
  const { pathname } = useLocation();
  const { projects } = useProjects();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [requestedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [taskSearch, setTaskSearch] = useState("");
  const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
  const [isPublishOpen, setPublishOpen] = useState(false);

  const selectedProjectId = projects.some(
    (project) => project.id === requestedProjectId,
  )
    ? requestedProjectId
    : (projects[0]?.id ?? null);

  useEffect(() => {
    const handleOpenTask = () => setCreateTaskOpen(true);
    const handleOpenPublish = () => setPublishOpen(true);
    window.addEventListener("gm-open-create-task", handleOpenTask);
    window.addEventListener("gm-open-publish", handleOpenPublish);
    return () => {
      window.removeEventListener("gm-open-create-task", handleOpenTask);
      window.removeEventListener("gm-open-publish", handleOpenPublish);
    };
  }, []);

  const activeProject = useMemo(() => {
    return (
      projects.find((p: ProjectSummary) => p.id === selectedProjectId) ??
      projects[0] ??
      null
    );
  }, [projects, selectedProjectId]);

  const { tasks } = useProjectTasks(activeProject?.id ?? 0);

  const filteredTasks = useMemo(() => {
    const term = taskSearch.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((t: Task) => t.name.toLowerCase().includes(term));
  }, [tasks, taskSearch]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t: Task) => t.state_code === "COMPLETADA",
    ).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      priority: number;
      due_date?: string;
    }) => {
      if (!activeProject) throw new Error("No hay proyecto activo");
      return await createTask(activeProject.id, {
        name: payload.name,
        description: payload.description,
        priority: payload.priority,
        due_date: payload.due_date || null,
        parent_id: null,
        state_code: "PENDIENTE",
        reason: "",
      });
    },
    onSuccess: () => {
      if (activeProject) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", activeProject.id],
        });
      }
      setCreateTaskOpen(false);
      addToast({
        icon: "success",
        title: "Tarea creada",
        message: "La tarea se añadió correctamente.",
      });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo crear la tarea",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  const createPubMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string }) => {
      if (!activeProject) throw new Error("No hay proyecto activo");
      const today = new Date().toISOString().slice(0, 10);
      return await createPublication({
        title: payload.title,
        description: payload.content,
        project_id: activeProject.id,
        vacancies: 1,
        weekly_hours: "40.00",
        opening_date: today,
        closing_date: today,
        state: "ABIERTA",
        requirements: [],
      });
    },
    onSuccess: () => {
      setPublishOpen(false);
      addToast({
        icon: "success",
        title: "Publicado",
        message: "La publicación se creó con éxito.",
      });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo crear la publicación",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  return {
    pathname,
    projects,
    activeProject,
    setSelectedProjectId,
    tasks: filteredTasks,
    taskStats,
    taskSearch,
    setTaskSearch,
    isCreateTaskOpen,
    setCreateTaskOpen,
    isPublishOpen,
    setPublishOpen,
    createTask: createTaskMutation.mutateAsync,
    createPublication: createPubMutation.mutateAsync,
    isSavingTask: createTaskMutation.isPending,
    isSavingPublication: createPubMutation.isPending,
  };
}
