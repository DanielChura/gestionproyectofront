import { useQuery } from "@tanstack/react-query";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import { getProjects } from "../../../core/services/projectService";
import { useToast } from "../../../hooks/useToast";
import { errorText } from "../../auth/api";

export function useProjects() {
  const { addToast } = useToast();

  const { data: projects = [], refetch } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const data = await getProjects();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        addToast({
          icon: "error",
          title: "Error al cargar proyectos",
          message: errorText(err),
        });
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  return { projects, refetch };
}
