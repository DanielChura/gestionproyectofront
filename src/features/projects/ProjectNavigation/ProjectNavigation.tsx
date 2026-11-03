import { Link } from "react-router";
import { projectPath } from "../../../routes";
import PlusIcon from "../../../shared/icons/PlusIcon";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import type { ProjectNavigationProps } from "../types";
import { projectCreateActionClassName } from "./navigationClasses";

const styles = {
  projects: "m-0 p-0 list-none flex flex-col gap-2",
  heading:
    "group/project relative flex min-w-0 items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800",
  project:
    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-1.5 text-xs no-underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700",
  message:
    "mx-2 mb-2 mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 [overflow-wrap:anywhere]",
  retry:
    "rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 mx-2 mb-3",
};

export default function ProjectNavigation({
  projects,
  currentPath,
  loading,
  error,
  canCreateTasks,
  onCreateTask,
  onRetry,
}: ProjectNavigationProps) {
  return (
    <div aria-busy={loading}>
      {loading && (
        <p className={styles.message} role="status">
          Cargando proyectos…
        </p>
      )}
      {error && (
        <p className={styles.message} role="alert">
          {error}
        </p>
      )}
      {error && (
        <button
          type="button"
          className={styles.retry}
          disabled={loading}
          onClick={onRetry}
        >
          Volver a cargar proyectos
        </button>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className={styles.message} role="status">
          No hay proyectos autorizados.
        </p>
      )}
      <ul
        className={styles.projects}
        aria-label="Proyectos autorizados"
        hidden={loading || Boolean(error)}
      >
        {projects.map((project) => {
          const path = projectPath(project.id);
          const active =
            currentPath === path || currentPath.startsWith(`${path}/`);
          return (
            <li key={project.id}>
              <div className={styles.heading}>
                <Link
                  to={path}
                  aria-current={active ? "page" : undefined}
                  title={project.name}
                  className={`${styles.project} ${active ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-400"}`}
                >
                  <span aria-hidden="true" className="shrink-0">
                    <ProjectsIcon className="size-4" fill={false} />
                  </span>
                  <span className="min-w-0 flex-1 truncate pr-8">
                    {project.name}
                  </span>
                </Link>
                {canCreateTasks && project.permissions.create_tasks && (
                  <button
                    className={`${projectCreateActionClassName} absolute right-1.5`}
                    type="button"
                    disabled={loading}
                    aria-label={`Crear tarea en ${project.name}`}
                    title="Crear tarea"
                    onClick={() => onCreateTask(project.id)}
                  >
                    <PlusIcon className="size-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}