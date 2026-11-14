import AreaProjectsToolbar from "./AreaProjectsToolbar";
import AreaProjectsTable from "./AreaProjectsTable";
import type { Area } from "../../../core/interfaces/organization.interface";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import type { ProjectSort } from "./useStructure";

interface AreaProjectsSectionProps {
  selectedArea: Area | null;
  projects: ProjectSummary[];
  search: string;
  onSearchChange: (value: string) => void;
  modeFilter: string;
  onModeFilterChange: (value: string) => void;
  sort: ProjectSort;
  onSortChange: (value: ProjectSort) => void;
}

export default function AreaProjectsSection({
  selectedArea,
  projects,
  search,
  onSearchChange,
  modeFilter,
  onModeFilterChange,
  sort,
  onSortChange,
}: AreaProjectsSectionProps) {
  const sectionTitle = selectedArea
    ? `Proyectos de ${selectedArea.name}`
    : "Todos los proyectos";

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
          {sectionTitle}
        </h2>
      </div>

      <AreaProjectsToolbar
        search={search}
        onSearchChange={onSearchChange}
        modeFilter={modeFilter}
        onModeFilterChange={onModeFilterChange}
        sort={sort}
        onSortChange={onSortChange}
        count={projects.length}
      />

      <AreaProjectsTable projects={projects} />
    </section>
  );
}

