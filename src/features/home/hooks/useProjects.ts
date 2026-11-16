import { useQuery } from "@tanstack/react-query";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import { getProjects } from "../../../core/services/projectService";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";
import { checkSession, errorText, sessionVersion } from "../../auth/api";

export function useProjects() {
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();
  const epoch = sessionVersion();

  const { data: projects = [], refetch } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    enabled: isAuthenticated,
    queryFn: async () => {
      checkSession(epoch);
      try {
        const data = await getProjects();
        checkSession(epoch);
        return Array.isArray(data) ? data : [];
      } catch (err) {
        checkSession(epoch);
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
