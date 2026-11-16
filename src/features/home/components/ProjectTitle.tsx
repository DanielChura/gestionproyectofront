import CalendarIcon from "../../../shared/icons/CalendarIcon";
import type { Project } from "../types";
import { formatTaskDate } from "../utils/taskHierarchy";

export default function ProjectTitle({ project, count, filtered }: {
  project: Project;
  count?: number;
  filtered?: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="flex min-w-0 flex-wrap items-baseline gap-3">
        <h1 title={project.name} className="m-0 min-w-0 text-lg font-medium text-neutral-800 [overflow-wrap:anywhere] dark:text-neutral-100">{project.name}</h1>
        <span data-task-count="true" role="status" className="text-xs text-neutral-600 dark:text-neutral-400">
          {filtered != null && filtered !== count ? `${filtered} de ${count}` : (count ?? 0)} {(count ?? 0) === 1 ? "tarea" : "tareas"}
        </span>
      </div>
      <div aria-label="Periodo del proyecto" className="flex shrink-0 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <CalendarIcon className="size-4" />
        {project.start_date ? <time dateTime={project.start_date}>{formatTaskDate(project.start_date)}</time> : <span>Sin fecha de inicio</span>}
        <span aria-hidden="true">→</span>
        {project.end_date ? <time dateTime={project.end_date}>{formatTaskDate(project.end_date)}</time> : <span>Sin fecha de fin</span>}
      </div>
    </div>
  );
}
