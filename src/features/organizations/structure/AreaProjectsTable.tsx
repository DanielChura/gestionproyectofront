import { Link } from "react-router";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import EyeIcon from "../../../shared/icons/EyeIcon";
import EditIcon from "../../../shared/icons/EditIcon";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

interface AreaProjectsTableProps {
  projects: ProjectSummary[];
}

export default function AreaProjectsTable({
  projects,
}: AreaProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-neutral-500 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        No hay proyectos registrados en esta sección.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <table className="w-full border-collapse text-xs text-left">
        <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 font-medium">
          <tr>
            <th className="p-3">Proyecto</th>
            <th className="p-3">Áreas vinculadas</th>
            <th className="p-3">Inicio</th>
            <th className="p-3">Modo</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.id}
              className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <ProjectsIcon className="size-4 text-orange-500 shrink-0" />
                  <div className="min-w-0">
                    <Link
                      to={`/proyectos/${p.id}`}
                      className="font-medium text-neutral-800 dark:text-neutral-100 hover:underline truncate block"
                    >
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="m-0 text-[11px] text-neutral-400 truncate max-w-xs">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  {p.areas?.map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-3 text-neutral-500">{p.start_date ?? "—"}</td>
              <td className="p-3 text-neutral-500">
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800">
                  {p.available ? "Disponible" : "Asignado"}
                </span>
              </td>
              <td className="p-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <Link
                    to={`/proyectos/${p.id}`}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Ver proyecto"
                  >
                    <EyeIcon className="size-4" />
                  </Link>
                  <Link
                    to={`/organizaciones/estructura?editar=${p.id}`}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Editar proyecto"
                  >
                    <EditIcon className="size-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
