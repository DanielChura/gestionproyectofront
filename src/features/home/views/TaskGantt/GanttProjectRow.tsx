import { useMemo } from "react";
import type { Project, Task } from "../../types";
import type { useTaskGantt } from "./useTaskGantt";
import { ganttProjectSummary } from "./ganttProjectSummary";
import { GanttIconButton } from "./GanttControl";
import PlusIcon from "../../../../shared/icons/PlusIcon";
import ChevronIcon from "../../../../shared/icons/ChevronIcon";

export default function GanttProjectRow({
  project,
  tasks,
  width,
  controls,
}: {
  project: Project;
  tasks: Task[];
  width: number;
  controls: ReturnType<typeof useTaskGantt>;
}) {
  const summary = useMemo(
    () => ganttProjectSummary(project, tasks),
    [project, tasks],
  );
  const label =
    summary.percent === null
      ? "Sin tareas"
      : `${summary.percent.toLocaleString("es-PE", { maximumFractionDigits: 2 })}%`;
  return (
    <div
      className="gm-gantt-project-row grid items-center border-b border-neutral-200 bg-neutral-50 text-xs dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-200"
      style={{ gridTemplateColumns: `min(${width + 4}px, 42%) minmax(0, 1fr)` }}
      aria-label="Resumen del proyecto"
    >
      <span className="truncate px-3 py-2 font-medium" title={project.name}>
        {project.name}
      </span>
      <nav
        aria-label="Navegación temporal de Gantt"
        data-zoom-level={controls.viewport.zoomLevel}
        className="flex min-w-0 items-center gap-1 py-1 pr-1 sm:gap-2"
        title={summary.tooltip}
      >
        <span className="sr-only" aria-live="polite">
          Zoom {controls.viewport.zoomLevel} de 9
        </span>
        <GanttIconButton label="Anterior" onClick={() => controls.page(-1)}>
          <ChevronIcon className="size-4 rotate-90" />
        </GanttIconButton>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {summary.percent !== null && (
            <progress
              className="gm-gantt-project-progress min-w-0 flex-1"
              max={100}
              value={summary.percent}
              aria-label={`Avance de ${project.name}`}
            />
          )}
          <span className="shrink-0 px-1 font-medium tabular-nums">
            {label}
          </span>
        </div>
        <GanttIconButton label="Siguiente" onClick={() => controls.page(1)}>
          <ChevronIcon className="size-4 -rotate-90" />
        </GanttIconButton>
        <div className="flex shrink-0 items-center rounded-lg border border-neutral-200 dark:border-neutral-700">
          <GanttIconButton
            label="Acercar cronograma"
            disabled={controls.viewport.zoomLevel === 9}
            onClick={() => controls.zoom(1)}
          >
            <PlusIcon className="size-4" />
          </GanttIconButton>
          <GanttIconButton
            label="Alejar cronograma"
            disabled={controls.viewport.zoomLevel === 1}
            onClick={() => controls.zoom(-1)}
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14" stroke="currentColor" />
            </svg>
          </GanttIconButton>
        </div>
      </nav>
    </div>
  );
}
