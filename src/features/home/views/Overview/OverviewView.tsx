import OverviewSkeleton from "./components/OverviewSkeleton";
import ProjectChartsSection from "./components/ProjectChartsSection";
import ProjectKpis from "./components/ProjectKpis";
import ProjectTeamTable from "./components/ProjectTeamTable";
import { useProjectCharts } from "./hooks/useOverview";

export default function OverviewView({ projectId }: { projectId: number }) {
  const { data, isLoading } = useProjectCharts(projectId);

  return (
    <section
      className="min-h-0 flex-1 overflow-y-auto py-"
      aria-label="Resumen del proyecto"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <OverviewSkeleton />
      ) : data ? (
        <div className="flex flex-col gap-3.5">
          <ProjectKpis summary={data.summary} />

          <ProjectChartsSection
            charts={data.charts}
            totalTasks={data.summary.total_tasks || 1}
          />

          <ProjectTeamTable people={data.tables?.people} />
        </div>
      ) : null}
    </section>
  );
}
