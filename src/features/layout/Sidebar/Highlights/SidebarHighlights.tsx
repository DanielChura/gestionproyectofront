import { Link, useLocation } from "react-router";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import FlagIcon from "../../../../shared/icons/FlagIcon";
import { getIcon } from "../../../../shared/icons/icon-catalog";
import { projectPath } from "../../../../routes";
import { usePriorityTasks } from "./usePriorityTasks";

const SKELETON_WIDTHS = [112, 88, 132];

function selectedProjectId(pathname: string): number | null {
  const match = pathname.match(/^\/proyectos\/(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function SidebarHighlights() {
  const { pathname } = useLocation();
  const projectId = selectedProjectId(pathname);
  const { tasks, isLoading } = usePriorityTasks(projectId);

  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
    >
      <footer className="flex items-center gap-2 border-t border-neutral-200 bg-neutral-50 p-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
        <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
          <FlagIcon className="size-4 shrink-0" />
          {tasks.length} {tasks.length === 1 ? "Prioridad" : "Prioridades"}
        </span>

        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {isLoading
            ? SKELETON_WIDTHS.map((width) => (
                <li key={width} className="shrink-0">
                  <Skeleton inline width={width} height={30} borderRadius={8} />
                </li>
              ))
            : tasks.map(({ id, projectId, name, state_name, state_tema }) => {
                const Icon = getIcon(state_tema?.icono);

                return (
                  <li key={id} className="shrink-0">
                    <Link
                      to={`${projectPath(projectId)}?tarea=${id}`}
                      title={state_name}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      <span
                        style={{ color: state_tema?.color ?? "#525252" }}
                        className="inline-flex shrink-0"
                      >
                        <Icon className="size-4" fill />
                      </span>
                      <span className="max-w-40 truncate">{name}</span>
                    </Link>
                  </li>
                );
              })}
        </ul>
      </footer>
    </SkeletonTheme>
  );
}
