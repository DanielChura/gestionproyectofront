import { useId, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { projectPath } from "../../../routes";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import ProjectAreaNavigation from "./ProjectAreaNavigation";
import { useProjects } from "../../proyectos/hooks/useProjects";

interface ProjectsMenuProps {
  isCollapsed?: boolean;
}

export default function ProjectsMenu({ isCollapsed }: ProjectsMenuProps) {
  const [open, setOpen] = useState(true);
  const itemsId = useId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { projects } = useProjects();

  if (isCollapsed) return null;

  return (
    <div className="mt-3">
      <div className="group/project relative mb-2 flex items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={itemsId}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <span className="min-w-0 flex-1 truncate pr-9 text-left">
            Proyectos
          </span>
          <span aria-hidden="true">
            <ChevronDownIcon className={`size-4 ${open ? "" : "-rotate-90"}`} />
          </span>
        </button>
      </div>
      <div id={itemsId} hidden={!open}>
        <ProjectAreaNavigation
          projects={projects}
          currentPath={pathname}
          canCreateTasks
          onCreateTask={(projectId) =>
            navigate(projectPath(projectId), {
              state: {
                taskCreationRequest: { projectId, sequence: Date.now() },
              },
            })
          }
        />
      </div>
    </div>
  );
}
