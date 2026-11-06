import ActivityIcon from "../../../../../shared/Icons/ActivityIcon";
import AlertIcon from "../../../../../shared/Icons/AlertIcon";
import ClockIcon from "../../../../../shared/Icons/ClockIcon";
import HourglassIcon from "../../../../../shared/Icons/HourglassIcon";
import CheckIcon from "../../../../../shared/Icons/CheckIcon";

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours === 0) return `${remMin}m`;
  if (remMin === 0) return `${hours}h`;
  return `${hours}h ${remMin}m`;
}

interface Props {
  summary: {
    total_tasks?: number;
    completion_percent: number;
    completed_tasks: number;
    average_progress: number;
    in_progress_tasks: number;
    not_started_tasks: number;
    closed_tasks: number;
    overdue_tasks?: number;
    estimated_minutes_completed: number;
    estimated_minutes_total: number;
  };
}

export default function ProjectKpis({ summary }: Props) {
  const totalTasks = summary.total_tasks || 1;
  const completionPercent = Math.min(
    100,
    Math.round(summary.completion_percent),
  );
  const activePercent = Math.min(
    100,
    Math.round((summary.in_progress_tasks / totalTasks) * 100),
  );

  const overdueCount = summary.overdue_tasks ?? 0;
  const onTimePercent = Math.max(
    0,
    100 - Math.round((overdueCount / totalTasks) * 100),
  );

  const hasEstimatedTime = summary.estimated_minutes_total > 0;
  const estimatedConsumedPercent = hasEstimatedTime
    ? Math.min(
        100,
        Math.round(
          (summary.estimated_minutes_completed /
            summary.estimated_minutes_total) *
            100,
        ),
      )
    : 0;

  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Indicadores clave"
    >
      {/* KPI 1: Avance Global */}
      <article className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs  text-neutral-600 dark:text-neutral-400">
          Avance global
        </h3>
        <div className="my-2">
          <div className="flex items-center gap-1.5 text-xl  text-neutral-800 dark:text-neutral-100">
            <ActivityIcon className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            {completionPercent}%
            <small className="text-[10px] font-normal text-neutral-500">
              ({summary.completed_tasks}/{summary.total_tasks} tareas)
            </small>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-green-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-neutral-500">
          Progreso medio: {Math.round(summary.average_progress)}%
        </p>
      </article>

      {/* KPI 2: Tareas Activas */}
      <article className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs  text-neutral-600 dark:text-neutral-400">
          Tareas activas
        </h3>
        <div className="my-2">
          <div className="flex items-center gap-1.5 text-xl  text-neutral-800 dark:text-neutral-100">
            <ClockIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            {summary.in_progress_tasks}
            <small className="text-[10px] font-normal text-neutral-500">
              ({activePercent}% del total)
            </small>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${activePercent}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-neutral-500">
          {summary.not_started_tasks} sin iniciar · {summary.closed_tasks}{" "}
          cerradas
        </p>
      </article>

      {/* KPI 3: Riesgo de Plazos */}
      <article
        className={`flex flex-col justify-between rounded-xl border p-3 ${
          overdueCount > 0
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        }`}
      >
        <h3 className="text-xs  text-neutral-600 dark:text-neutral-400">
          Riesgo de plazos
        </h3>
        <div className="my-2">
          <div
            className={`flex items-center gap-1.5 text-xl  ${
              overdueCount > 0
                ? "text-amber-800 dark:text-amber-300"
                : "text-neutral-800 dark:text-neutral-100"
            }`}
          >
            {overdueCount > 0 ? (
              <AlertIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckIcon className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            )}
            {overdueCount}
            <small className="text-[10px] font-normal text-neutral-500">
              {overdueCount === 1 ? "vencida" : "vencidas"}
            </small>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full ${overdueCount > 0 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${onTimePercent}%` }}
            />
          </div>
        </div>
        <p
          className={`text-[10px] ${overdueCount > 0 ? " text-amber-700 dark:text-amber-400" : "text-neutral-500"}`}
        >
          {overdueCount > 0
            ? `${onTimePercent}% a tiempo`
            : "100% entregas a tiempo"}
        </p>
      </article>

      {/* KPI 4: Esfuerzo Estimado */}
      <article className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs  text-neutral-600 dark:text-neutral-400">
          Esfuerzo estimado
        </h3>
        <div className="my-2">
          <div className="flex items-center gap-1.5 text-xl  text-neutral-800 dark:text-neutral-100">
            <HourglassIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            {formatMinutes(summary.estimated_minutes_completed)}
            <small className="text-[10px] font-normal text-neutral-500">
              de {formatMinutes(summary.estimated_minutes_total)}
            </small>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${estimatedConsumedPercent}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-neutral-500">
          {hasEstimatedTime
            ? `${estimatedConsumedPercent}% completado`
            : "Sin estimación"}
        </p>
      </article>
    </section>
  );
}
