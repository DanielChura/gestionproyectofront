import { Link } from "react-router";
import Button from "../../../shared/components/Button/Button";
import SectionHeader from "../../layout/SectionHeader/SectionHeader";
import BuildingIcon from "../../../shared/icons/BuildingIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import DashboardIcon from "../../../shared/icons/Dashboard";
import FileIcon from "../../../shared/icons/FileIcon";
import FolderIcon from "../../../shared/icons/FolderIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import StarIcon from "../../../shared/icons/StarIcon";
import TeamsIcon from "../../../shared/icons/TeamsIcon";
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
  { id: "gantt", label: "Gantt", Icon: CalendarIcon, color: "bg-yellow-500" },
] as const;

interface ProjectHeaderProps {
  project: Project;
  viewKey: string;
  onToggleFavorite: () => void;
  onShare?: () => void;
  pending?: boolean;
}

export default function ProjectHeader({
  project,
  viewKey,
  onToggleFavorite,
  onShare,
  pending = false,
}: ProjectHeaderProps) {
  const areaName = project.areas?.[0]?.name ?? "Área no disponible";
  const currentView = VIEWS.find((v) => v.id === viewKey)?.label ?? "Lista";

  return (
    <SectionHeader
      title={
        <nav className="min-w-0 text-sm">
          <ol className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <li className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <BuildingIcon className="size-4 shrink-0" />
              <span className="truncate">{areaName}</span>
            </li>
            <li className="flex items-center gap-1">
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <FolderIcon className="size-4 shrink-0" fill={false} />
              <Link
                to={projectPath(project.id)}
                className="min-w-0 truncate hover:underline"
              >
                {project.name}
              </Link>
            </li>
            <li className="flex shrink-0 items-center gap-1 text-neutral-800 dark:text-neutral-200">
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <span>{currentView}</span>
            </li>
            <li className="shrink-0">
              <button
                type="button"
                disabled={pending}
                onClick={onToggleFavorite}
                className={`rounded-md p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  project.is_favorite ? "text-yellow-400" : "text-neutral-400"
                }`}
              >
                <StarIcon className="size-4" fill={project.is_favorite} />
              </button>
            </li>
          </ol>
        </nav>
      }
      action={
        onShare && (
          <Button type="button" onClick={onShare}>
            <TeamsIcon className="size-4" />
            <span>Compartir</span>
          </Button>
        )
      }
    >
      <nav className="flex flex-wrap gap-2 text-xs">
        {VIEWS.map(({ id, label, Icon, color }) => (
          <Link
            key={id}
            to={`?vista=${id}`}
            className={`flex items-center gap-1.5 border-b-2 pb-2 font-medium ${
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
    </SectionHeader>
  );
}
