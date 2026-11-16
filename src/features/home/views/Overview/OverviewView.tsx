import OverviewSkeleton from "./components/OverviewSkeleton";
import ProjectChartsSection from "./components/ProjectChartsSection";
import ProjectKpis from "./components/ProjectKpis";
import ProjectMemberRoles from "./components/ProjectMemberRoles";
import ProjectTeamTable from "./components/ProjectTeamTable";
import { useProjectCharts } from "./hooks/useOverview";
import type {
  Project,
  ProjectMemberRole,
} from "../../../../core/interfaces/task.interface";

interface OverviewViewProps {
  project: Project;
  onMemberRoleChange: (
    workerId: number,
    role: ProjectMemberRole,
  ) => Promise<void>;
}

export default function OverviewView({
  project,
  onMemberRoleChange,
}: OverviewViewProps) {
  const { data, isLoading } = useProjectCharts(project.id);

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

          <ProjectMemberRoles
            participants={project.participants}
            canManage={project.permissions.manage}
            onChange={onMemberRoleChange}
          />

          <ProjectTeamTable people={data.tables?.people} />
        </div>
      ) : null}
    </section>
  );
}
