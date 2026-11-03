import { useCallback, useEffect, useState } from "react";
import type { ProjectSummary } from "../../core/interfaces/project.interface";
import { getProjects } from "../../core/services/projectService";
import { useToast } from "../../hooks/useToast";
import { errorText } from "../auth/api";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const { addToast } = useToast();

  const loadProjects = useCallback(async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast({
        icon: "error",
        title: "Error al cargar proyectos",
        message: errorText(err),
      });
    }
  }, [addToast]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return { projects, refetch: loadProjects };
}