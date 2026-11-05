import { useQuery } from "@tanstack/react-query";
import { getProjectCharts } from "../../../../../core/services/projectService";
import type { ProjectChartsResponse } from "../../../../../core/interfaces/projectOverview.interface";
import { useToast } from "../../../../../hooks/useToast";
import { errorText } from "../../../../auth/api";

export function useProjectCharts(projectId: number) {
  const { addToast } = useToast();

  const { data = null, error } = useQuery<ProjectChartsResponse>({
    queryKey: ["projectCharts", projectId],
    queryFn: async () => {
      try {
        return await getProjectCharts(projectId);
      } catch (err) {
        const message = errorText(err);
        addToast({
          icon: "error",
          title: "Error al cargar métricas",
          message,
        });
        throw err;
      }
    },
    enabled: Number.isSafeInteger(projectId) && projectId > 0,
    staleTime: 1000 * 60 * 5,
  });

  return { data, error: error ? errorText(error) : "" };
}
