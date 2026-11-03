import { useParams } from "react-router";
import { useProjectCharts } from "./hooks/useProjectOverview";
import ProjectKpis from "./components/ProjectKpis";
import ProjectChartsSection from "./components/ProjectChartsSection";
import ProjectTeamTable from "./components/ProjectTeamTable";

export default function ProjectSummaryPage() {
  const { projectId } = useParams();
  const id = Number(projectId);

  const isValidId = projectId && Number.isSafeInteger(id) && id >= 1;
  const { data, loading, error } = useProjectCharts(isValidId ? id : 0);

  if (!isValidId) {
    return (
      <main className="p-5 text-sm text-neutral-800 dark:text-neutral-100">
        Proyecto no disponible.
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" role="status">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Cargando métricas del proyecto…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
        role="alert"
      >
        <p className="text-xs  text-red-800 dark:text-red-400">
          {error || "No se pudieron obtener las métricas del proyecto."}
        </p>
      </div>
    );
  }

  return (
    <main id="main-content" className="flex min-h-full flex-col">
      <div
        className="flex flex-col gap-3.5 py-4"
        aria-label="Panel de métricas del proyecto"
      >
        <ProjectKpis summary={data.summary} />

        <ProjectChartsSection
          charts={data.charts}
          totalTasks={data.summary.total_tasks || 1}
        />

        <ProjectTeamTable people={data.tables?.people} />
      </div>
    </main>
  );
}
