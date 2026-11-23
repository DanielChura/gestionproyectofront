import { Link } from "react-router";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ActivityIcon from "../../../shared/icons/ActivityIcon";
import DotsIcon from "../../../shared/icons/DotsIcon";
import EyeIcon from "../../../shared/icons/EyeIcon";
import EditIcon from "../../../shared/icons/EditIcon";
import Table, {
  type TableColumn,
} from "../../../shared/components/Table/Table";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

interface AreaProjectsTableProps {
  projects: ProjectSummary[];
  isLoading?: boolean;
}

export default function AreaProjectsTable({
  projects,
  isLoading = false,
}: AreaProjectsTableProps) {
  const columns: TableColumn<ProjectSummary>[] = [
    {
      key: "name",
      header: "Proyecto",
      icon: ProjectsIcon,
      render: (project) => (
        <div className="flex items-center gap-2">
          <ProjectsIcon className="size-4 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <Link
              to={`/proyectos/${project.id}`}
              className="font-medium text-neutral-800 dark:text-neutral-100 hover:underline truncate block"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="m-0 text-[11px] text-neutral-400 truncate max-w-xs">
                {project.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "areas",
      header: "Áreas vinculadas",
      icon: StackIcon,
      render: (project) => (
        <div className="flex flex-wrap gap-1">
          {project.areas?.map((area) => (
            <span
              key={area.id}
              className="px-2 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              {area.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Inicio",
      icon: CalendarIcon,
      render: (project) => (
        <span className="text-neutral-500">{project.start_date ?? "—"}</span>
      ),
    },
    {
      key: "mode",
      header: "Modo",
      icon: ActivityIcon,
      render: (project) => (
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
          {project.available ? "Disponible" : "Asignado"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      icon: DotsIcon,
      headerClassName: "text-right",
      cellClassName: "text-right w-20",
      render: (project) => (
        <div className="inline-flex items-center gap-1">
          <Link
            to={`/proyectos/${project.id}`}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
            title="Ver proyecto"
          >
            <EyeIcon className="size-4" />
          </Link>
          <Link
            to={`/organizaciones/estructura?editar=${project.id}`}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
            title="Editar proyecto"
          >
            <EditIcon className="size-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={projects}
      keyExtractor={(project) => project.id}
      isLoading={isLoading}
      skeletonRows={6}
      emptyMessage="No hay proyectos registrados en esta sección."
    />
  );
}
