import { Link } from "react-router";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import ProjectAreaNavigation from "../Sidebar/ProjectAreaNavigation";

interface NavigationSection {
  id: string;
  label: string;
  items: { path: string; label: string }[];
}

interface NavSectionProps {
  section: NavigationSection;
  currentPath: string;
  projects: ProjectSummary[];
  canCreateProject: boolean;
  projectCreationDisabled: boolean;
  onCreateProject: () => void;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
}

function NavSection({
  section,
  currentPath,
  projects,
  canCreateProject,
  projectCreationDisabled,
  onCreateProject,
  canCreateTasks,
  onCreateTask,
}: NavSectionProps) {
  const itemsId = `${section.id}-navigation`;

  return (
    <section aria-labelledby={`${section.id}-heading`}>
      <div className="flex items-center justify-between gap-2.5 mb-1.5">
        <p
          id={`${section.id}-heading`}
          className="m-0 mx-2 text-neutral-600 text-xs tracking-widest uppercase"
        >
          {section.label}
        </p>
        {section.id === "projects" && canCreateProject && (
          <button
            className="w-7 h-7 p-0 border border-neutral-200  text-neutral-900 text-lg cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Crear proyecto"
            disabled={projectCreationDisabled}
            title={
              projectCreationDisabled
                ? "Crear proyecto: esperando servicio y catálogos"
                : "Crear proyecto"
            }
            onClick={onCreateProject}
          >
            +
          </button>
        )}
      </div>
      <ul id={itemsId} className="grid gap-0.5 m-0 p-0 list-none">
        {section.items.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              aria-current={currentPath === item.path ? "page" : undefined}
              className={`flex items-center w-full min-h-[38px] px-2.5 py-2 text-sm leading-snug no-underline shadow-none ${currentPath === item.path ? "text-neutral-900 bg-neutral-200 font-" : "text-neutral-600 bg-white font-normal"}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {section.id === "projects" && (
        <ProjectAreaNavigation
          projects={projects}
          currentPath={currentPath}
          canCreateTasks={canCreateTasks}
          onCreateTask={onCreateTask}
        />
      )}
    </section>
  );
}

export default NavSection;
