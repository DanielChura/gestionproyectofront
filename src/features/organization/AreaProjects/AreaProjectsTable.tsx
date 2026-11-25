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
        <Link
          to={`/proyectos/${project.id}`}
          className="block min-w-0 truncate text-neutral-800 hover:underline dark:text-neutral-100"
        >
          {project.name}
        </Link>
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
              className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
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
      render: (project) => project.start_date ?? "—",
    },
    {
      key: "mode",
      header: "Modo",
      icon: ActivityIcon,
      render: (project) => (
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {project.available ? "Disponible" : "Asignado"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      icon: DotsIcon,
      headerClassName: "text-center",
      cellClassName: "text-center w-20",
      render: (project) => (
        <div className="inline-flex items-center gap-1">
          <Link
            to={`/proyectos/${project.id}`}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Ver proyecto"
          >
            <EyeIcon className="size-4" />
          </Link>
          <Link
            to={`/organizaciones/estructura?editar=${project.id}`}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Editar proyecto"
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
