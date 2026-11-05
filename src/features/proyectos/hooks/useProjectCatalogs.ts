import { useQuery } from "@tanstack/react-query";
import type { ProjectCatalogs } from "../../../core/interfaces/project.interface";
import { getProjectCatalogs } from "../../../core/services/projectService";
import { errorText } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";

const initialCatalogs: ProjectCatalogs = {
  areas: [],
  states: [],
  priorities: [],
};

export function useProjectCatalogs() {
  const { addToast } = useToast();

  const { data: catalogs = initialCatalogs } = useQuery<ProjectCatalogs>({
    queryKey: ["projectCatalogs"],
    queryFn: async () => {
      try {
        return await getProjectCatalogs();
      } catch (err) {
        addToast({
          icon: "error",
          title: "Error al cargar catálogos",
          message: errorText(err),
        });
        throw err;
      }
    },
    staleTime: 1000 * 60 * 30,
  });

  return { catalogs };
}
