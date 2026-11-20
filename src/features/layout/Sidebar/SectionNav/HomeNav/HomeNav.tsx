import TaskForm from "../../../../home/shared/task-form/TaskForm";
import PublishModal from "../../../../home/components/PublishModal";
import PublicationIcon from "../../../../../shared/icons/PublicationIcon";
import TaskListIcon from "../../../../../shared/icons/TaskListIcon";
import NavLinks from "../NavLinks/NavLinks";
import NavGroup from "../NavGroup/NavGroup";
import ProjectsByArea from "../../ProjectsByArea/ProjectsByArea";
import RecentTasks from "../../RecentTasks/RecentTasks";
import { useHomeNav } from "./useHomeNav";
import { useProject } from "../../../../home/hooks/useProject";
import { useProjectCatalogs } from "../../../../home/hooks/useProjectCatalogs";
import type { SubRoute } from "../../../../../routes";

interface HomeNavProps {
  items: SubRoute[];
  pathname: string;
  canManage: boolean;
}

export default function HomeNav({ items, pathname, canManage }: HomeNavProps) {
  const { activeProject, actions } = useHomeNav(pathname);
  const { project } = useProject(activeProject?.id ?? 0);
  const { catalogs } = useProjectCatalogs();

  return (
    <>
      <div className="mb-1 flex flex-col gap-1">
        <button
          type="button"
          disabled={!activeProject}
          onClick={() => actions.setTaskOpen(true)}
          className="badge w-full disabled:opacity-50"
        >
          <TaskListIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Crear tarea</span>
        </button>

        <button
          type="button"
          disabled={!activeProject || !canManage}
          onClick={() => actions.setPubOpen(true)}
          className="badge w-full disabled:cursor-not-allowed disabled:opacity-30"
        >
          <PublicationIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            Crear publicación
          </span>
        </button>
      </div>

      <NavLinks items={items} pathname={pathname} />

      <NavGroup title="Proyectos por área">
        <ProjectsByArea currentPath={pathname} />
      </NavGroup>

      {activeProject && (
        <NavGroup title="Mis últimas tareas">
          <RecentTasks projectId={activeProject.id} />
        </NavGroup>
      )}

      {actions.isTaskOpen && activeProject && project && (
        <TaskForm
          project={project}
          catalogs={catalogs}
          onSubmit={async (data) => {
            await actions.createTask(data);
          }}
          onConfigured={() => {}}
          onClose={() => actions.setTaskOpen(false)}
        />
      )}

      {actions.isPubOpen && activeProject && (
        <PublishModal
          projectName={activeProject.name}
          submitting={actions.isSavingPublication}
          onClose={() => actions.setPubOpen(false)}
          onSubmit={actions.createPublication}
        />
      )}
    </>
  );
}
