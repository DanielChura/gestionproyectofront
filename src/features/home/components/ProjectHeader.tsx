import { Link } from "react-router";
import BuildingIcon from "../../../shared/icons/BuildingIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ProjectTitle from "./ProjectTitle";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import DashboardIcon from "../../../shared/icons/Dashboard";
import FileIcon from "../../../shared/icons/FileIcon";
import FolderIcon from "../../../shared/icons/FolderIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import StarIcon from "../../../shared/icons/StarIcon";
import { projectPath } from "../../../routes";
import type { Project } from "../../../core/interfaces/task.interface";

const VIEWS = [
  { id: "lista", label: "Lista", Icon: FileIcon, color: "bg-sky-500" },
  { id: "tablero", label: "Tablero", Icon: StackIcon, color: "bg-emerald-500" },
  {
    id: "overview",
    label: "Overview",
    Icon: DashboardIcon,
    color: "bg-indigo-500",
  },
  { id: "gantt", label: "Gantt", Icon: CalendarIcon, color: "bg-amber-500" },
] as const;

interface ProjectHeaderProps {
  project: Project;
  viewKey: string;
  onToggleFavorite: () => void;
  status?: {
    taskCount?: number;
    filteredCount?: number | null;
    pending?: boolean;
    error?: string;
  };
}

export default function ProjectHeader({
  project,
  viewKey,
  onToggleFavorite,
  status = {},
}: ProjectHeaderProps) {
  const areaName = project.areas?.[0]?.name ?? "Área no disponible";
  const currentView = VIEWS.find((v) => v.id === viewKey)?.label ?? "Lista";

  return (
    <header className="-mx-4 -mt-4 mb-3 border-b border-neutral-200 dark:border-neutral-800">
      {viewKey === "gantt" && (
        <ProjectTitle
          project={project}
          count={status.taskCount}
          filtered={status.filteredCount}
        />
      )}
      <div className="flex min-w-0 items-center px-4 py-2.5">
        <nav aria-label="Ruta de navegación" className="min-w-0 text-sm">
          <ol className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <li className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <BuildingIcon className="size-4 shrink-0" />
              <span className="truncate" title={areaName}>
                {areaName}
              </span>
            </li>
            <li className="flex items-center gap-1">
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <FolderIcon className="size-4 shrink-0" fill={false} />
              <Link
                to={projectPath(project.id)}
                title={project.name}
                className="min-w-0 truncate hover:underline"
              >
                {project.name}
              </Link>
            </li>
            <li
              aria-current="page"
              className={`flex items-center gap-1 text-neutral-800 dark:text-neutral-200 ${viewKey === "gantt" ? "shrink-0 font-medium" : ""}`}
            >
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <span>{currentView}</span>
            </li>
            <li className="shrink-0">
              <button
                type="button"
                aria-label={
                  project.is_favorite
                    ? "Quitar proyecto de favoritos"
                    : "Añadir proyecto a favoritos"
                }
                aria-pressed={project.is_favorite}
                aria-busy={status.pending ?? false}
                disabled={status.pending}
                onClick={onToggleFavorite}
                className={`cursor-pointer rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  project.is_favorite ? "text-amber-500" : "text-neutral-400"
                }`}
              >
                <StarIcon className="size-4" fill={project.is_favorite} />
              </button>
            </li>
          </ol>
        </nav>
      </div>

      {status.error && (
        <p
          role="alert"
          className="m-0 px-4 text-xs text-red-600 dark:text-red-400"
        >
          No se pudo actualizar el favorito. {status.error}
        </p>
      )}
      <nav aria-label="Vistas del proyecto" className="flex gap-2 px-4 text-xs">
        {VIEWS.map(({ id, label, Icon, color }) => (
          <Link
            key={id}
            to={`?vista=${id}`}
            className={`flex items-center gap-1.5 border-b-2 pb-2  ${
              viewKey === id
                ? "border-neutral-800 text-neutral-800 dark:border-neutral-100 dark:text-neutral-100"
                : "border-transparent text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            <span className={`rounded p-0.5 text-neutral-100 ${color}`}>
              <Icon className="size-3" fill />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
