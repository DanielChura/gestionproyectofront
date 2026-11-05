import ProjectChartsSection from "./components/ProjectChartsSection";
import ProjectKpis from "./components/ProjectKpis";
import ProjectTeamTable from "./components/ProjectTeamTable";
import { useProjectCharts } from "./hooks/useOverview";

export default function OverviewView({ projectId }: { projectId: number }) {
  const { data, error } = useProjectCharts(projectId);

  if (error || !data) {
    return (
      <section
        className="m-4 flex-1 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
        role="alert"
      >
        <p className="text-xs text-red-800 dark:text-red-400">
          {error || "No se pudieron obtener las métricas del proyecto."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="min-h-0 flex-1 overflow-y-auto py-4"
      aria-label="Resumen del proyecto"
    >
      <div className="flex flex-col gap-3.5">
        <ProjectKpis summary={data.summary} />

        <ProjectChartsSection
          charts={data.charts}
          totalTasks={data.summary.total_tasks || 1}
        />

        <ProjectTeamTable people={data.tables?.people} />
      </div>
    </section>
  );
}
