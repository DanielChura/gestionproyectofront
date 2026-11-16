import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask } from "../../../core/services/taskService";
import { createPublication } from "../../../core/services/publicationService";
import { useToast } from "../../../hooks/useToast";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

export function useHomeActions(project: ProjectSummary | null) {
  const [isTaskOpen, setTaskOpen] = useState(false);
  const [isPubOpen, setPubOpen] = useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const taskMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      priority: number;
      due_date?: string;
    }) => {
      if (!project) throw new Error("No hay proyecto activo");
      return createTask(project.id, {
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
      if (project) {
        queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
      }
      setTaskOpen(false);
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

  const pubMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string }) => {
      if (!project) throw new Error("No hay proyecto activo");
      const today = new Date().toISOString().slice(0, 10);
      return createPublication({
        title: payload.title,
        description: payload.content,
        project_id: project.id,
        vacancies: 1,
        weekly_hours: "40.00",
        opening_date: today,
        closing_date: today,
        state: "ABIERTA",
        requirements: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publications"] });
      setPubOpen(false);
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
    isTaskOpen,
    setTaskOpen,
    isPubOpen,
    setPubOpen,
    createTask: taskMutation.mutateAsync,
    createPublication: pubMutation.mutateAsync,
    isSavingTask: taskMutation.isPending,
    isSavingPublication: pubMutation.isPending,
  };
}
