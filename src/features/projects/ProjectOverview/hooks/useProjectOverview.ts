import { useEffect, useState } from "react";
import { getProjectCharts } from "../../../../core/services/projectService";
import type { ProjectChartsResponse } from "../../../../core/interfaces/projectOverview.interface";

export function useProjectCharts(projectId: number) {
  const [data, setData] = useState<ProjectChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getProjectCharts(projectId)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message ?? "Error al cargar gráficos");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  return { data, loading, error };
}
