import { Link } from "react-router";
import { projectPath } from "../../../routes";
import BuildingIcon from "../../../shared/icons/BuildingIcon";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import FileIcon from "../../../shared/icons/FileIcon";
import FolderIcon from "../../../shared/icons/FolderIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import StarIcon from "../../../shared/icons/StarIcon";
import type { ProjectHeaderProps } from "../types";
import { useProjectFavorite } from "../useProjectFavorite";
import DashboardIcon from "../../../shared/icons/Dashboard";
import ChartDotsIcon from "../../../shared/icons/ChartDotsIcon";

const views = [
  ["lista", "Lista", FileIcon, "bg-sky-500"],
  ["tablero", "Tablero", StackIcon, "bg-emerald-500"],
  ["gantt", "Gantt", ChartDotsIcon, "bg-neutral-500"],
  ["overview", "Overview", DashboardIcon, "bg-indigo-500"],
] as const;
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700";

export default function ProjectHeader({
  project,
  view,
  taskCount,
  filteredCount,
}: Pick<ProjectHeaderProps, "project" | "view" | "taskCount"> & {
  filteredCount?: number | null;
}) {
  const { favorite, pending, error, toggle } = useProjectFavorite(
    project.id,
    project.is_favorite,
  );
  const currentView =
    views.find(([key]) => key === view)?.[1] ?? "Vista no disponible";
  const area = project.areas[0];
  const favoriteLabel = favorite
    ? "Quitar proyecto de favoritos"
    : "Añadir proyecto a favoritos";

  return (
    <header className="min-w-0 shrink-0 text-neutral-800 dark:text-neutral-100">
      <div className="flex min-w-0 items-center">
        <nav
          aria-label="Ruta de navegación"
          className="min-w-0 flex-1 text-xs sm:text-sm mb-1"
        >
          <ol className="flex min-w-0 items-center gap-1 sm:gap-2">
            <li className="flex min-w-0 shrink items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <span aria-hidden="true" className="shrink-0">
                <BuildingIcon className="size-4" />
              </span>
              <span className="truncate" title={area?.name}>
                {area?.name ?? "Área no disponible"}
              </span>
            </li>
            <li className="flex min-w-0 shrink items-center gap-1 sm:gap-1.5">
              <span
                aria-hidden="true"
                className="shrink-0 text-neutral-700 dark:text-neutral-300"
              >
                <ChevronDownIcon className="size-4 -rotate-90" />
              </span>
              <span aria-hidden="true" className="shrink-0">
                <FolderIcon className="size-4" fill={false} />
              </span>
              <span className="min-w-0 text-xs    sm:text-sm">
                <Link
                  to={projectPath(project.id)}
                  title={project.name}
                  className={`block truncate rounded hover:underline ${focus}`}
                >
                  {project.name}
                </Link>
              </span>
            </li>
            <li
              aria-current="page"
              className="flex shrink-0 items-center gap-1   sm:gap-1.5"
            >
              <span
                aria-hidden="true"
                className="shrink-0 text-neutral-700 dark:text-neutral-300"
              >
                <ChevronDownIcon className="size-4 -rotate-90" />
              </span>
              {currentView}
            </li>
            <li className="shrink-0">
              <button
                type="button"
                aria-label={favoriteLabel}
                title={favoriteLabel}
                aria-pressed={favorite}
                aria-busy={pending}
                disabled={pending}
                onClick={() => void toggle()}
                className={`flex cursor-pointer items-center rounded-lg p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 disabled:cursor-wait disabled:opacity-50 aria-pressed:text-neutral-800 pointer-coarse:p-2 ${focus}`}
              >
                <StarIcon className="size-4" fill={favorite} />
              </button>
            </li>
          </ol>
        </nav>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          No se pudo actualizar el favorito. {error}
        </p>
      )}
      <div className="mt-1 border-b border-neutral-200 dark:border-neutral-800">
        <nav
          aria-label="Vistas del proyecto"
          className="flex gap-3 text-xs   text-neutral-700 dark:text-neutral-300"
        >
          {views.map(([key, label, Icon, color]) => (
            <Link
              key={key}
              to={`?vista=${key}`}
              aria-current={view === key ? "page" : undefined}
              className={`flex items-center gap-1 border-b border-transparent px-1 py-1.5 hover:bg-neutral-100 rounded-t-lg hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 aria-[current=page]:border-neutral-800 aria-[current=page]:text-neutral-800 dark:aria-[current=page]:border-neutral-100 dark:aria-[current=page]:text-neutral-100 ${focus}`}
            >
              <span
                className={`inline-flex items-center justify-center rounded p-0.5 ${color} text-white`}
              >
                <Icon className="size-3" fill={true} />
              </span>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
