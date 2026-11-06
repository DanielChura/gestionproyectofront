import { Link, useLocation, useParams } from "react-router";
import BuildingIcon from "../../shared/Icons/BuildingIcon";
import ChevronDownIcon from "../../shared/Icons/ChevronIcon";
import DashboardIcon from "../../shared/Icons/Dashboard";
import FileIcon from "../../shared/Icons/FileIcon";
import FolderIcon from "../../shared/Icons/FolderIcon";
import StackIcon from "../../shared/Icons/StackIcon";
import StarIcon from "../../shared/Icons/StarIcon";
import { projectPath } from "../../routes";
import { useProject } from "./hooks/useProject";
import ListaView from "./views/Lista/ListaView";
import TableroView from "./views/Tablero/TableroView";
import OverviewView from "./views/Overview/OverviewView";

const VIEWS = [
  { id: "lista", label: "Lista", Icon: FileIcon, color: "bg-sky-500" },
  { id: "tablero", label: "Tablero", Icon: StackIcon, color: "bg-emerald-500" },
  {
    id: "overview",
    label: "Overview",
    Icon: DashboardIcon,
    color: "bg-indigo-500",
  },
] as const;

export default function ProjectPage() {
  const { projectId } = useParams();
  const { search } = useLocation();
  const { project, setProject, toggleFavorite } = useProject(Number(projectId));

  if (!project) return null;

  const viewKey = new URLSearchParams(search).get("vista") ?? "lista";
  const areaName = project.areas?.[0]?.name ?? "Área no disponible";
  const currentView = VIEWS.find((v) => v.id === viewKey)?.label ?? "Lista";

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col text-neutral-800 dark:text-neutral-100">
      <header className="min-w-0 shrink-0">
        <nav className="mb-1 text-sm">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            <li className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <BuildingIcon className="size-4 shrink-0" />
              <span className="truncate">{areaName}</span>
            </li>
            <li className="flex items-center gap-1">
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <FolderIcon className="size-4 shrink-0" fill={false} />
              <Link
                to={projectPath(project.id)}
                className="truncate hover:underline"
              >
                {project.name}
              </Link>
            </li>
            <li className="flex items-center gap-1 font-medium text-neutral-800 dark:text-neutral-200">
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-neutral-400" />
              <span>{currentView}</span>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleFavorite}
                className={`cursor-pointer rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  project.is_favorite ? "text-amber-500" : "text-neutral-400"
                }`}
              >
                <StarIcon className="size-4" fill={project.is_favorite} />
              </button>
            </li>
          </ol>
        </nav>

        <nav className="flex gap-2 border-b border-neutral-200 text-xs dark:border-neutral-800">
          {VIEWS.map(({ id, label, Icon, color }) => (
            <Link
              key={id}
              to={`?vista=${id}`}
              className={`flex items-center gap-1.5 border-b-2 px-2.5 py-2 font-medium ${
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

      {viewKey === "tablero" && (
        <TableroView project={project} onProjectChange={setProject} />
      )}
      {viewKey === "overview" && <OverviewView projectId={project.id} />}
      {viewKey !== "tablero" && viewKey !== "overview" && (
        <ListaView project={project} onProjectChange={setProject} />
      )}
    </main>
  );
}
